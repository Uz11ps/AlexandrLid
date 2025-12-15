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
  Button,
  Tabs,
  Tab,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { botAdminAPI } from '../api/bot-admin';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function UserActivity() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  
  // Общая статистика
  const [activityStats, setActivityStats] = useState(null);
  
  // Список пользователей с активностью
  const [usersActivity, setUsersActivity] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    loadActivityStats();
    loadUsersActivity();
  }, [days]);

  const loadActivityStats = async () => {
    try {
      setLoading(true);
      const data = await botAdminAPI.getActivityStats(days);
      setActivityStats(data);
      setError(null);
    } catch (err) {
      console.error('Error loading activity stats:', err);
      setError('Ошибка при загрузке статистики');
    } finally {
      setLoading(false);
    }
  };

  const loadUsersActivity = async (page = 1) => {
    try {
      setUsersLoading(true);
      const data = await botAdminAPI.getUsersActivity(days, page, 50);
      setUsersActivity(data.users);
      setUsersTotal(data.pagination.total);
      setUsersPage(page);
      setError(null);
    } catch (err) {
      console.error('Error loading users activity:', err);
      setError('Ошибка при загрузке активности пользователей');
    } finally {
      setUsersLoading(false);
    }
  };

  const getActivityTypeLabel = (type) => {
    const labels = {
      command: 'Команды',
      message: 'Сообщения',
      callback: 'Кнопки',
      subscription: 'Подписки',
      giveaway_join: 'Розыгрыши',
      referral: 'Рефералы'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Статистика активности пользователей
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Период</InputLabel>
          <Select
            value={days}
            label="Период"
            onChange={(e) => setDays(e.target.value)}
          >
            <MenuItem value={7}>7 дней</MenuItem>
            <MenuItem value={30}>30 дней</MenuItem>
            <MenuItem value={60}>60 дней</MenuItem>
            <MenuItem value={90}>90 дней</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => { loadActivityStats(); loadUsersActivity(); }}>
          Обновить
        </Button>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Общая статистика" />
        <Tab label="Активность пользователей" />
        <Tab label="Графики" />
      </Tabs>

      {tab === 0 && activityStats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Активность по типам
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Тип</TableCell>
                        <TableCell align="right">Всего</TableCell>
                        <TableCell align="right">Уникальных пользователей</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activityStats.activity_by_type.map((item) => (
                        <TableRow key={item.activity_type}>
                          <TableCell>
                            <Chip 
                              label={getActivityTypeLabel(item.activity_type)} 
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{item.total_count}</TableCell>
                          <TableCell align="right">{item.unique_users}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Топ активных пользователей
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Пользователь</TableCell>
                        <TableCell align="right">Активность</TableCell>
                        <TableCell align="right">Активных дней</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activityStats.top_users.slice(0, 10).map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            {user.username || user.first_name || `ID: ${user.user_id}`}
                          </TableCell>
                          <TableCell align="right">{user.total_activities}</TableCell>
                          <TableCell align="right">{user.active_days}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Активность пользователей
            </Typography>
            {usersLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Пользователь</TableCell>
                        <TableCell align="right">Всего активностей</TableCell>
                        <TableCell align="right">Активных дней</TableCell>
                        <TableCell align="right">Команды</TableCell>
                        <TableCell align="right">Сообщения</TableCell>
                        <TableCell align="right">Кнопки</TableCell>
                        <TableCell align="right">Подписки</TableCell>
                        <TableCell align="right">Розыгрыши</TableCell>
                        <TableCell align="right">Рефералы</TableCell>
                        <TableCell>Последняя активность</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usersActivity.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            {user.username || user.first_name || `ID: ${user.user_id}`}
                          </TableCell>
                          <TableCell align="right">{user.total_activities || 0}</TableCell>
                          <TableCell align="right">{user.active_days || 0}</TableCell>
                          <TableCell align="right">{user.commands_count || 0}</TableCell>
                          <TableCell align="right">{user.messages_count || 0}</TableCell>
                          <TableCell align="right">{user.callbacks_count || 0}</TableCell>
                          <TableCell align="right">{user.subscriptions_count || 0}</TableCell>
                          <TableCell align="right">{user.giveaway_joins_count || 0}</TableCell>
                          <TableCell align="right">{user.referrals_count || 0}</TableCell>
                          <TableCell>
                            {user.last_activity 
                              ? new Date(user.last_activity).toLocaleString('ru-RU')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button
                    disabled={usersPage === 1}
                    onClick={() => loadUsersActivity(usersPage - 1)}
                  >
                    Назад
                  </Button>
                  <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                    Страница {usersPage} из {Math.ceil(usersTotal / 50)}
                  </Typography>
                  <Button
                    disabled={usersPage >= Math.ceil(usersTotal / 50)}
                    onClick={() => loadUsersActivity(usersPage + 1)}
                  >
                    Вперед
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && activityStats && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Активность по типам
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityStats.activity_by_type}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="activity_type" 
                      tickFormatter={getActivityTypeLabel}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_count" fill="#8884d8" name="Всего" />
                    <Bar dataKey="unique_users" fill="#82ca9d" name="Уникальных пользователей" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Активность по дням
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityStats.activity_by_day}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="activity_date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total_count" 
                      stroke="#8884d8" 
                      name="Всего активностей"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="unique_users" 
                      stroke="#82ca9d" 
                      name="Уникальных пользователей"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default UserActivity;

