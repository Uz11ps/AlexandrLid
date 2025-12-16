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

// Словарь для расшифровки технических ID кнопок в понятные названия
const ACTION_LABELS = {
  'menu_main': '📋 Главное меню',
  'menu_profile': '👤 Профиль',
  'menu_leaderboard': '🏆 Лидерборд',
  'menu_tickets': '🎫 Тикеты',
  'menu_giveaways': '🎁 Розыгрыши',
  'menu_help': '❓ Помощь',
  'giveaway_join': '🎁 Участвовать в розыгрыше',
  'giveaway_view': '👀 Просмотр розыгрыша',
  'check_subscription': '✅ Проверить подписку',
  'ticket_new': '➕ Новый тикет',
  'ticket_view': '👀 Просмотр тикета',
  'ticket_reply': '💬 Ответить в тикет'
};

// Функция для получения понятного названия действия
const getActionLabel = (actionId) => {
  if (!actionId) return 'Неизвестное действие';
  
  // Проверяем точное совпадение
  if (ACTION_LABELS[actionId]) {
    return ACTION_LABELS[actionId];
  }
  
  // Проверяем префиксы (например, giveaway_join_123)
  for (const [key, label] of Object.entries(ACTION_LABELS)) {
    if (actionId.startsWith(key)) {
      return label;
    }
  }
  
  // Если не найдено, возвращаем оригинальный ID
  return actionId;
};

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
  
  // Детальная аналитика
  const [heatmapData, setHeatmapData] = useState(null);
  const [popularActions, setPopularActions] = useState(null);
  const [popularCommands, setPopularCommands] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  useEffect(() => {
    loadActivityStats();
    loadUsersActivity();
    if (tab === 3) {
      loadDetailedAnalytics();
    }
  }, [days, tab]);

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

  const loadDetailedAnalytics = async () => {
    try {
      setDetailedLoading(true);
      const [heatmap, actions, commands] = await Promise.all([
        botAdminAPI.getActivityHeatmap(days),
        botAdminAPI.getPopularActions(days, 20),
        botAdminAPI.getPopularCommands(days, 20)
      ]);
      setHeatmapData(heatmap);
      setPopularActions(actions);
      setPopularCommands(commands);
      setError(null);
    } catch (err) {
      console.error('Error loading detailed analytics:', err);
      setError('Ошибка при загрузке детальной аналитики');
    } finally {
      setDetailedLoading(false);
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

  // Функция для создания данных тепловой карты
  const prepareHeatmapData = () => {
    if (!heatmapData || !heatmapData.heatmap) return [];
    
    const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Создаем матрицу 7x24 (дни недели × часы)
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));
    
    // Заполняем матрицу данными
    heatmapData.heatmap.forEach(item => {
      const day = parseInt(item.day_of_week);
      const hour = parseInt(item.hour);
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        matrix[day][hour] = parseInt(item.count);
      }
    });
    
    // Преобразуем в формат для визуализации
    const result = [];
    daysOfWeek.forEach((dayName, dayIndex) => {
      hours.forEach(hour => {
        result.push({
          day: dayName,
          dayIndex,
          hour: `${hour}:00`,
          hourIndex: hour,
          value: matrix[dayIndex][hour]
        });
      });
    });
    
    return result;
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
        <Tab label="Детальная аналитика" />
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

      {tab === 3 && (
        <Grid container spacing={3}>
          {detailedLoading ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : (
            <>
              {/* Тепловая карта активности */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Тепловая карта активности (по часам и дням недели)
                    </Typography>
                    {heatmapData && (
                      <>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart
                            data={prepareHeatmapData()}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="hour" 
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <Paper sx={{ p: 1 }}>
                                      <Typography variant="body2">
                                        {data.day}, {data.hour}
                                      </Typography>
                                      <Typography variant="body2" color="primary">
                                        Активностей: {data.value}
                                      </Typography>
                                    </Paper>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="value" 
                              fill="#8884d8"
                              name="Количество активностей"
                            >
                              {prepareHeatmapData().map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.value > 0 
                                    ? `rgba(136, 132, 216, ${Math.min(entry.value / 100, 1)})` 
                                    : '#f0f0f0'
                                  } 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        
                        {/* Статистика по часам */}
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Активность по часам суток
                          </Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={heatmapData.by_hour}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="hour" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#82ca9d" name="Активностей" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                        
                        {/* Статистика по дням недели */}
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Активность по дням недели
                          </Typography>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={heatmapData.by_day_of_week}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="day_of_week"
                                tickFormatter={(value) => {
                                  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                                  return days[value] || value;
                                }}
                              />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="count" fill="#FF8042" name="Активностей" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Популярные действия (кнопки) */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Популярные разделы (Кнопки)
                    </Typography>
                    {popularActions && popularActions.actions.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={popularActions.actions.map(action => ({
                              ...action,
                              label: getActionLabel(action.action_id)
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis 
                              dataKey="label" 
                              type="category"
                              width={90}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#0088FE" name="Нажатий">
                              {popularActions.actions.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <TableContainer sx={{ mt: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Действие</TableCell>
                                <TableCell align="right">Нажатий</TableCell>
                                <TableCell align="right">Уникальных</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {popularActions.actions.slice(0, 10).map((action) => (
                                <TableRow key={action.action_id}>
                                  <TableCell>
                                    {getActionLabel(action.action_id)}
                                  </TableCell>
                                  <TableCell align="right">{action.count}</TableCell>
                                  <TableCell align="right">{action.unique_users}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Нет данных о действиях за выбранный период
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Популярные команды */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Использование команд
                    </Typography>
                    {popularCommands && popularCommands.commands.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={popularCommands.commands}
                            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="command"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#00C49F" name="Использований">
                              {popularCommands.commands.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <TableContainer sx={{ mt: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Команда</TableCell>
                                <TableCell align="right">Использований</TableCell>
                                <TableCell align="right">Уникальных</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {popularCommands.commands.slice(0, 10).map((cmd) => (
                                <TableRow key={cmd.command}>
                                  <TableCell>
                                    <Chip label={`/${cmd.command}`} size="small" />
                                  </TableCell>
                                  <TableCell align="right">{cmd.count}</TableCell>
                                  <TableCell align="right">{cmd.unique_users}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Нет данных о командах за выбранный период
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      )}
    </Container>
  );
}

export default UserActivity;

