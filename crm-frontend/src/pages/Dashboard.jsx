import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Assignment as TaskIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../api/analytics';
import { tasksAPI } from '../api/tasks';
import { leadsAPI } from '../api/leads';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    leads: 0,
    students: 0,
    revenue: 0,
    pending_tasks: 0,
    recent_conversions: 0
  });
  const [leadsChartData, setLeadsChartData] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, leadsRes, tasksRes, remindersRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        leadsAPI.getAll({ limit: 100 }).catch(() => ({ data: { leads: [] } })),
        tasksAPI.getAll({ status: 'in_progress', limit: 10 }).catch(() => ({ data: { tasks: [] } })),
        tasksAPI.getAll({ task_type: 'reminder', status: 'new', limit: 10 }).catch(() => ({ data: { tasks: [] } }))
      ]);

      setStats(dashboardRes.data);
      
      // Подготовка данных для графика лидов (за последние 7 дней)
      const leads = leadsRes.data.leads || [];
      const chartDataMap = {};
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        chartDataMap[dateStr] = 0;
      }
      
      leads.forEach(lead => {
        const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
        if (chartDataMap.hasOwnProperty(leadDate)) {
          chartDataMap[leadDate]++;
        }
      });
      
      const chartData = Object.keys(chartDataMap).map(date => ({
        date: new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        leads: chartDataMap[date]
      }));
      setLeadsChartData(chartData);
      
      setActiveTasks(tasksRes.data.tasks || []);
      setReminders(remindersRes.data.tasks || []);
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'new': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Дашборд
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Верхняя секция: График лидов слева, метрики справа */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              График лидов (последние 7 дней)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Лидов"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PeopleIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Лидов
                      </Typography>
                      <Typography variant="h5">
                        {stats.leads || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MoneyIcon color="success" sx={{ mr: 1, fontSize: 32 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Выручка
                      </Typography>
                      <Typography variant="h5">
                        {new Intl.NumberFormat('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          minimumFractionDigits: 0
                        }).format(stats.revenue || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TaskIcon color="warning" sx={{ mr: 1, fontSize: 32 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Задач
                      </Typography>
                      <Typography variant="h5">
                        {stats.pending_tasks || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUpIcon color="info" sx={{ mr: 1, fontSize: 32 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Конверсий
                      </Typography>
                      <Typography variant="h5">
                        {stats.recent_conversions || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Нижняя секция: Таблица активных задач слева, напоминания справа */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Активные задачи
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Название</TableCell>
                    <TableCell>Лид</TableCell>
                    <TableCell>Дата выполнения</TableCell>
                    <TableCell>Приоритет</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Нет активных задач
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeTasks.map((task) => (
                      <TableRow 
                        key={task.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/tasks`)}
                      >
                        <TableCell>{task.title}</TableCell>
                        <TableCell>{task.lead_name || '-'}</TableCell>
                        <TableCell>
                          {new Date(task.due_date).toLocaleDateString('ru-RU')} {task.due_time || ''}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={task.priority || 'normal'} 
                            size="small"
                            color={task.priority === 'urgent' ? 'error' : task.priority === 'high' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={task.status === 'in_progress' ? 'В работе' : task.status}
                            size="small"
                            color={getStatusColor(task.status)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Напоминания
            </Typography>
            {reminders.length === 0 ? (
              <Typography color="textSecondary" variant="body2">
                Нет напоминаний
              </Typography>
            ) : (
              <List>
                {reminders.map((reminder) => (
                  <ListItem 
                    key={reminder.id}
                    sx={{ 
                      mb: 1, 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/leads/${reminder.lead_id}`)}
                  >
                    <ListItemText
                      primary={reminder.title}
                      secondary={
                        <>
                          <Typography variant="caption" display="block">
                            {reminder.lead_name || 'Без лида'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(reminder.due_date).toLocaleDateString('ru-RU')} {reminder.due_time || ''}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;

