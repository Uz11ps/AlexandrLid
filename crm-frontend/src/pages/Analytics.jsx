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
  InputLabel
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon
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

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [funnelRes, financialRes, managersRes, sourcesRes] = await Promise.all([
        analyticsAPI.getFunnel(),
        analyticsAPI.getFinancial({ period }),
        analyticsAPI.getManagers(),
        analyticsAPI.getSources()
      ]);

      setFunnelData(funnelRes.data || []);
      setFinancialData(financialRes.data);
      setManagersData(managersRes.data || []);
      setSourcesData(sourcesRes.data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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

        {/* Финансовая аналитика */}
        {financialData && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
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
                          currency: 'RUB'
                        }).format(financialData.revenue?.total_revenue || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
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
                          currency: 'RUB'
                        }).format(financialData.revenue?.average_check || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
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
          </Grid>
        )}

        {/* Воронка продаж */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Воронка продаж
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="funnel_stage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Количество" />
              <Bar dataKey="converted" fill="#82ca9d" name="Конвертировано" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Аналитика по источникам */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Лиды по источникам
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Эффективность менеджеров
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Менеджер</TableCell>
                      <TableCell align="right">Лидов</TableCell>
                      <TableCell align="right">Конверсия</TableCell>
                      <TableCell align="right">Выручка</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {managersData.map((manager) => (
                      <TableRow key={manager.id}>
                        <TableCell>{manager.name}</TableCell>
                        <TableCell align="right">{manager.leads_count || 0}</TableCell>
                        <TableCell align="right">
                          {manager.converted_count && manager.leads_count
                            ? `${((manager.converted_count / manager.leads_count) * 100).toFixed(1)}%`
                            : '0%'}
                        </TableCell>
                        <TableCell align="right">
                          {new Intl.NumberFormat('ru-RU', {
                            style: 'currency',
                            currency: 'RUB'
                          }).format(manager.total_revenue || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Container>
  );
}

export default Analytics;

