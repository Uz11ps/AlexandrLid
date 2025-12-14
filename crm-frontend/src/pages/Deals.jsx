import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Chip,
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { dealsAPI } from '../api/deals';
import { leadsAPI } from '../api/leads';
import { productsAPI } from '../api/products';

function Deals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({
    lead_id: '',
    product_type: 'course',
    product_id: '',
    amount: '',
    currency: 'RUB',
    stage: 'draft',
    probability_percent: 0
  });

  useEffect(() => {
    loadDeals();
    loadLeads();
    loadCourses();
  }, [page, rowsPerPage]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const response = await dealsAPI.getAll();
      setDeals(response.data || []);
      setTotal(response.data?.length || 0);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await leadsAPI.getAll({ limit: 100 });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await productsAPI.getCourses();
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await dealsAPI.create(newDeal);
      setCreateDialogOpen(false);
      setNewDeal({
        lead_id: '',
        product_type: 'course',
        product_id: '',
        amount: '',
        currency: 'RUB',
        stage: 'draft',
        probability_percent: 0
      });
      loadDeals();
    } catch (error) {
      console.error('Error creating deal:', error);
      alert('Ошибка при создании сделки');
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'closed': return 'success';
      case 'lost': return 'error';
      case 'draft': return 'default';
      default: return 'primary';
    }
  };

  if (loading) {
    return (
      <Layout>
        <LinearProgress />
      </Layout>
    );
  }

  return (
    <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Сделки</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Создать сделку
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Лид</TableCell>
                <TableCell>Продукт</TableCell>
                <TableCell>Сумма</TableCell>
                <TableCell>Этап</TableCell>
                <TableCell>Вероятность</TableCell>
                <TableCell>Менеджер</TableCell>
                <TableCell>Дата создания</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Сделки не найдены
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => (
                  <TableRow key={deal.id} hover>
                    <TableCell>{deal.id}</TableCell>
                    <TableCell>{deal.lead_name || `ID: ${deal.lead_id}`}</TableCell>
                    <TableCell>{deal.product_type}</TableCell>
                    <TableCell>
                      {deal.amount ? `${deal.amount} ${deal.currency || 'RUB'}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={deal.stage}
                        color={getStageColor(deal.stage)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{deal.probability_percent || 0}%</TableCell>
                    <TableCell>{deal.manager_name || '-'}</TableCell>
                    <TableCell>
                      {new Date(deal.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/deals/${deal.id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />

        {/* Dialog создания сделки */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Создать сделку</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Лид</InputLabel>
              <Select
                value={newDeal.lead_id}
                onChange={(e) => setNewDeal({ ...newDeal, lead_id: e.target.value })}
              >
                {leads.map(lead => (
                  <MenuItem key={lead.id} value={lead.id}>
                    {lead.fio || lead.telegram_username || `ID: ${lead.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Тип продукта</InputLabel>
              <Select
                value={newDeal.product_type}
                onChange={(e) => setNewDeal({ ...newDeal, product_type: e.target.value })}
              >
                <MenuItem value="course">Курс</MenuItem>
                <MenuItem value="package">Тариф</MenuItem>
                <MenuItem value="service">Услуга</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Продукт</InputLabel>
              <Select
                value={newDeal.product_id}
                onChange={(e) => setNewDeal({ ...newDeal, product_id: e.target.value })}
              >
                {courses.map(course => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Сумма"
              type="number"
              value={newDeal.amount}
              onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Вероятность (%)"
              type="number"
              value={newDeal.probability_percent}
              onChange={(e) => setNewDeal({ ...newDeal, probability_percent: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} variant="contained" disabled={!newDeal.lead_id}>
              Создать
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Deals;

