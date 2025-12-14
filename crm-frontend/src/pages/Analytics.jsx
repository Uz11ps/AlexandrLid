import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  ShoppingCart as ShoppingCartIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { analyticsAPI } from '../api/analytics';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function Analytics() {
  const [funnelData, setFunnelData] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [managersData, setManagersData] = useState([]);
  const [sourcesData, setSourcesData] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [funnelRes, financialRes, managersRes, sourcesRes] = await Promise.all([
        analyticsAPI.getFunnel().catch(err => ({ data: [], error: err })),
        analyticsAPI.getFinancial({ period }).catch(err => ({ data: null, error: err })),
        analyticsAPI.getManagers().catch(err => ({ data: [], error: err })),
        analyticsAPI.getSources().catch(err => ({ data: [], error: err }))
      ]);

      if (funnelRes.error) console.error('Funnel error:', funnelRes.error);
      if (financialRes.error) console.error('Financial error:', financialRes.error);
      if (managersRes.error) console.error('Managers error:', managersRes.error);
      if (sourcesRes.error) console.error('Sources error:', sourcesRes.error);

      setFunnelData(funnelRes.data || []);
      setFinancialData(financialRes.data);
      setManagersData(managersRes.data || []);
      setSourcesData(sourcesRes.data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Не удалось загрузить данные аналитики. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6B6B', '#4ECDC4'];

  // Форматирование даты для графика
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (period === 'year') {
      return date.toLocaleDateString('ru-RU', { month: 'short' });
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  // Подготовка данных для графика тренда
  const trendData = financialData?.trend?.map(item => ({
    date: formatDate(item.date),
    revenue: parseFloat(item.revenue) || 0,
    transactions: parseInt(item.transactions) || 0
  })) || [];

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Аналитика</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Период</InputLabel>
          <Select
            value={period}
            label="Период"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="day">День</MenuItem>
            <MenuItem value="week">Неделя</MenuItem>
            <MenuItem value="month">Месяц</MenuItem>
            <MenuItem value="year">Год</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Финансовая аналитика */}
      {financialData && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MoneyIcon color="primary" sx={{ mr: 1, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Выручка
                      </Typography>
                      <Typography variant="h5">
                        {new Intl.NumberFormat('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          minimumFractionDigits: 0
                        }).format(financialData.revenue?.total_revenue || 0)}
                      </Typography>
                      {financialData.revenue?.transaction_count > 0 && (
                        <Typography variant="caption" color="textSecondary">
                          {financialData.revenue.transaction_count} транзакций
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AssessmentIcon color="success" sx={{ mr: 1, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Средний чек
                      </Typography>
                      <Typography variant="h5">
                        {new Intl.NumberFormat('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          minimumFractionDigits: 0
                        }).format(financialData.revenue?.average_check || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PeopleIcon color="warning" sx={{ mr: 1, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Активных студентов
                      </Typography>
                      <Typography variant="h5">
                        {financialData.active_students || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ShoppingCartIcon color="info" sx={{ mr: 1, fontSize: 40 }} />
                    <Box>
                      <Typography color="textSecondary" variant="body2">
                        Источников
                      </Typography>
                      <Typography variant="h5">
                        {financialData.by_source?.length || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* График динамики выручки */}
          {trendData.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Динамика выручки
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'revenue') {
                        return [new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value), 'Выручка'];
                      }
                      return [value, 'Транзакций'];
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8884d8" 
                    name="Выручка"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="transactions" 
                    stroke="#82ca9d" 
                    name="Транзакций"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          )}

          {/* Выручка по источникам */}
          {financialData.by_source && financialData.by_source.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Выручка по источникам
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Источник</TableCell>
                      <TableCell align="right">Выручка</TableCell>
                      <TableCell align="right">Студентов</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialData.by_source.map((source, index) => (
                      <TableRow key={source.source || index}>
                        <TableCell>
                          <Chip 
                            label={source.source || 'Не указан'} 
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                            minimumFractionDigits: 0
                          }).format(source.revenue || 0)}
                        </TableCell>
                        <TableCell align="right">{source.students_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* Воронка продаж */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Воронка продаж
        </Typography>
        {funnelData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="funnel_stage" 
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Количество лидов" />
              <Bar dataKey="converted" fill="#82ca9d" name="Конвертировано" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">Нет данных для отображения</Typography>
          </Box>
        )}
      </Paper>

      {/* Аналитика по источникам */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Лиды по источникам
            </Typography>
            {sourcesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, leads_count }) => 
                      `${name || 'Не указан'}: ${leads_count} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="leads_count"
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">Нет данных для отображения</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Эффективность менеджеров
            </Typography>
            {managersData.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Менеджер</TableCell>
                      <TableCell align="right">Лидов</TableCell>
                      <TableCell align="right">Конверсия</TableCell>
                      <TableCell align="right">Выручка</TableCell>
                      <TableCell align="right">Задач</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {managersData.map((manager) => {
                      const conversionRate = manager.converted_count && manager.leads_count
                        ? ((manager.converted_count / manager.leads_count) * 100).toFixed(1)
                        : 0;
                      return (
                        <TableRow key={manager.id}>
                          <TableCell>{manager.name || manager.email}</TableCell>
                          <TableCell align="right">{manager.leads_count || 0}</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${conversionRate}%`}
                              size="small"
                              color={conversionRate > 20 ? 'success' : conversionRate > 10 ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {new Intl.NumberFormat('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              minimumFractionDigits: 0
                            }).format(manager.total_revenue || 0)}
                          </TableCell>
                          <TableCell align="right">{manager.tasks_completed || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">Нет данных для отображения</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Дополнительная статистика по источникам */}
      {sourcesData.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Детальная статистика по источникам
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Источник</TableCell>
                  <TableCell align="right">Лидов</TableCell>
                  <TableCell align="right">Конвертировано</TableCell>
                  <TableCell align="right">Конверсия</TableCell>
                  <TableCell align="right">Выручка</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sourcesData.map((source, index) => (
                  <TableRow key={source.source || index}>
                    <TableCell>
                      <Chip 
                        label={source.source || 'Не указан'} 
                        size="small"
                        sx={{ bgcolor: COLORS[index % COLORS.length], color: 'white' }}
                      />
                    </TableCell>
                    <TableCell align="right">{source.leads_count || 0}</TableCell>
                    <TableCell align="right">{source.converted_count || 0}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${source.conversion_rate || 0}%`}
                        size="small"
                        color={source.conversion_rate > 20 ? 'success' : source.conversion_rate > 10 ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0
                      }).format(source.total_revenue || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}

export default Analytics;
