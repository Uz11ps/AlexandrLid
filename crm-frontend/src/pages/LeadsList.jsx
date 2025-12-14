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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { leadsAPI } from '../api/leads';
import { funnelAPI } from '../api/funnel';
import Layout from '../components/Layout';

const FUNNEL_STAGES = [
  'Новый лид',
  'Первичный контакт',
  'Квалификация',
  'Презентация курса',
  'Работа с возражениями',
  'Отправка оффера',
  'Ожидание оплаты',
  'Конвертирован в студента',
  'Отказ'
];

function LeadsList() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [funnelStages, setFunnelStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [funnelFilter, setFunnelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'funnel'

  useEffect(() => {
    loadFunnelStages();
    loadLeads();
  }, [page, rowsPerPage, funnelFilter, search]);

  const loadFunnelStages = async () => {
    try {
      const response = await funnelAPI.getStages();
      setFunnelStages(response.data || []);
    } catch (error) {
      console.error('Error loading funnel stages:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(funnelFilter && { funnel_stage: funnelFilter }),
        ...(search && { search })
      };

      const response = await leadsAPI.getAll(params);
      const leadsData = response.data.leads || [];
      setLeads(leadsData);
      setTotal(response.data.pagination?.total || 0);
      
      // Группировка по этапам для воронки
      const grouped = {};
      leadsData.forEach(lead => {
        const stage = lead.funnel_stage || 'Новый лид';
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push(lead);
      });
      setLeadsByStage(grouped);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      await funnelAPI.updateLeadStage(leadId, newStage);
      loadLeads();
    } catch (error) {
      console.error('Error updating lead stage:', error);
      alert('Ошибка при изменении этапа');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'горячий': return 'error';
      case 'теплый': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Лиды</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant={viewMode === 'table' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('table')}
            >
              Таблица
            </Button>
            <Button
              variant={viewMode === 'funnel' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('funnel')}
            >
              Воронка
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            label="Поиск"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Этап воронки</InputLabel>
            <Select
              value={funnelFilter}
              label="Этап воронки"
              onChange={(e) => setFunnelFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              {funnelStages.map(stage => (
                <MenuItem key={stage.id} value={stage.name}>{stage.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {viewMode === 'funnel' ? (
          <Grid container spacing={2}>
            {funnelStages.map(stage => (
              <Grid item xs={12} md={6} lg={4} key={stage.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {stage.name} ({leadsByStage[stage.name]?.length || 0})
                    </Typography>
                    <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                      {(leadsByStage[stage.name] || []).map(lead => (
                        <Card
                          key={lead.id}
                          sx={{ mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="body2" fontWeight="bold">
                              {lead.fio || lead.telegram_username || `ID: ${lead.id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {lead.phone || lead.email || '-'}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip
                                label={lead.priority}
                                color={getPriorityColor(lead.priority)}
                                size="small"
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>Телефон</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telegram</TableCell>
                <TableCell>Этап</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Приоритет</TableCell>
                <TableCell>Дата создания</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  hover
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{lead.id}</TableCell>
                  <TableCell>{lead.fio || '-'}</TableCell>
                  <TableCell>{lead.phone || '-'}</TableCell>
                  <TableCell>{lead.email || '-'}</TableCell>
                  <TableCell>@{lead.telegram_username || '-'}</TableCell>
                  <TableCell>{lead.funnel_stage}</TableCell>
                  <TableCell>{lead.status}</TableCell>
                  <TableCell>
                    <Chip
                      label={lead.priority}
                      color={getPriorityColor(lead.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                </TableRow>
              ))}
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
        )}
      </Container>
    </Layout>
  );
}

export default LeadsList;

