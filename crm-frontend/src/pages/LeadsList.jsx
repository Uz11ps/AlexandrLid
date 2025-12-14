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
  AppBar,
  Toolbar,
  Typography,
  Button,
  Chip
} from '@mui/material';
import { leadsAPI } from '../api/leads';
import { useAuth } from '../contexts/AuthContext';

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
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [funnelFilter, setFunnelFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLeads();
  }, [page, rowsPerPage, funnelFilter, search]);

  const loadLeads = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(funnelFilter && { funnel_stage: funnelFilter }),
        ...(search && { search })
      };

      const response = await leadsAPI.getAll(params);
      setLeads(response.data.leads || []);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading leads:', error);
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
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Лиды
          </Typography>
          <Button color="inherit" onClick={() => navigate('/')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={() => navigate('/tasks')}>
            Задачи
          </Button>
          <Button color="inherit" onClick={logout}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
              {FUNNEL_STAGES.map(stage => (
                <MenuItem key={stage} value={stage}>{stage}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

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
      </Container>
    </Box>
  );
}

export default LeadsList;

