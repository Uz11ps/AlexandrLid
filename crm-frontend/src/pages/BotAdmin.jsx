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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { botAdminAPI } from '../api/bot-admin';

function BotAdmin() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [autofunnels, setAutofunnels] = useState([]);
  const [leadMagnets, setLeadMagnets] = useState([]);
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({});
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [giveawayDialogOpen, setGiveawayDialogOpen] = useState(false);
  const [autofunnelDialogOpen, setAutofunnelDialogOpen] = useState(false);
  const [leadMagnetDialogOpen, setLeadMagnetDialogOpen] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message_text: '',
    buttons: [],
    scheduled_at: '',
    target_audience: 'all'
  });
  const [newGiveaway, setNewGiveaway] = useState({
    title: '',
    description: '',
    prize_description: '',
    end_date: '',
    status: 'draft'
  });
  const [newAutofunnel, setNewAutofunnel] = useState({
    name: '',
    trigger_event: 'registration',
    delay_hours: 0,
    message_text: '',
    is_active: true
  });
  const [newLeadMagnet, setNewLeadMagnet] = useState({
    title: '',
    type: 'text',
    text_content: '',
    link_url: '',
    file_id: '',
    file_type: ''
  });
  const [settings, setSettings] = useState({
    channel_id: '',
    channel_username: ''
  });
  const [editBroadcast, setEditBroadcast] = useState(null);
  const [editAutofunnel, setEditAutofunnel] = useState(null);
  const [editGiveaway, setEditGiveaway] = useState(null);
  const [editLeadMagnet, setEditLeadMagnet] = useState(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 0) {
        const response = await botAdminAPI.getStats();
        setStats(response.data);
      } else if (tab === 1) {
        const response = await botAdminAPI.getAllUsers();
        setUsers(response.data.users || []);
      } else if (tab === 2) {
        const response = await botAdminAPI.getBroadcasts();
        setBroadcasts(response.data || []);
      } else if (tab === 3) {
        const response = await botAdminAPI.getAutofunnels();
        setAutofunnels(response.data || []);
      } else if (tab === 4) {
        const response = await botAdminAPI.getLeadMagnets();
        setLeadMagnets(response.data.lead_magnets || []);
      } else if (tab === 5) {
        const response = await botAdminAPI.getGiveaways();
        setGiveaways(response.data || []);
      } else if (tab === 6) {
        // Экспорт - ничего не загружаем
      } else if (tab === 7) {
        const response = await botAdminAPI.getSettings();
        setSettings(response.data || { channel_id: '', channel_username: '' });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    if (confirm('Заблокировать пользователя?')) {
      try {
        await botAdminAPI.banUser(userId);
        loadData();
      } catch (error) {
        console.error('Error banning user:', error);
        alert('Ошибка при блокировке');
      }
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await botAdminAPI.unbanUser(userId);
      loadData();
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Ошибка при разблокировке');
    }
  };

  const handleToggleAutofunnel = async (id, isActive) => {
    try {
      await botAdminAPI.updateAutofunnel(id, { is_active: !isActive });
      loadData();
    } catch (error) {
      console.error('Error updating autofunnel:', error);
    }
  };

  const handleActivateLeadMagnet = async (id) => {
    try {
      await botAdminAPI.activateLeadMagnet(id);
      loadData();
    } catch (error) {
      console.error('Error activating lead magnet:', error);
    }
  };

  const handleSendBroadcast = async (id) => {
    if (confirm('Отправить рассылку сейчас?')) {
      try {
        await botAdminAPI.sendBroadcast(id);
        alert('Рассылка запущена');
        loadData();
      } catch (error) {
        console.error('Error sending broadcast:', error);
        alert('Ошибка при отправке рассылки');
      }
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (confirm('Удалить рассылку?')) {
      try {
        await botAdminAPI.deleteBroadcast(id);
        loadData();
      } catch (error) {
        console.error('Error deleting broadcast:', error);
        alert('Ошибка при удалении рассылки');
      }
    }
  };

  const handleDeleteAutofunnel = async (id) => {
    if (confirm('Удалить автоворонку?')) {
      try {
        await botAdminAPI.deleteAutofunnel(id);
        loadData();
      } catch (error) {
        console.error('Error deleting autofunnel:', error);
        alert('Ошибка при удалении автоворонки');
      }
    }
  };

  const handleDeleteGiveaway = async (id) => {
    if (confirm('Удалить розыгрыш?')) {
      try {
        await botAdminAPI.deleteGiveaway(id);
        loadData();
      } catch (error) {
        console.error('Error deleting giveaway:', error);
        alert('Ошибка при удалении розыгрыша');
      }
    }
  };

  const handleDeleteLeadMagnet = async (id) => {
    if (confirm('Удалить лид-магнит?')) {
      try {
        await botAdminAPI.deleteLeadMagnet(id);
        loadData();
      } catch (error) {
        console.error('Error deleting lead magnet:', error);
        alert('Ошибка при удалении лид-магнита');
      }
    }
  };

  const handleExport = async (type, format) => {
    try {
      const response = await botAdminAPI.exportData(type, format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${type}_${Date.now()}.${format === 'excel' || format === 'xlsx' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Ошибка при экспорте данных');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await botAdminAPI.updateChannelSettings(settings);
      alert('Настройки сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ошибка при сохранении настроек');
    }
  };

  return (
    <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Админка бота
        </Typography>

        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Статистика" />
          <Tab label="Пользователи" />
          <Tab label="Рассылки" />
          <Tab label="Автоворонки" />
          <Tab label="Лид-магниты" />
          <Tab label="Розыгрыши" />
          <Tab label="Экспорт" />
          <Tab label="Настройки" />
        </Tabs>

        {/* Статистика */}
        {tab === 0 && stats && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Всего пользователей
                  </Typography>
                  <Typography variant="h4">
                    {stats.total_users || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Всего рефералов
                  </Typography>
                  <Typography variant="h4">
                    {stats.total_referrals || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Отправлено рассылок
                  </Typography>
                  <Typography variant="h4">
                    {stats.total_broadcasts || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Пользователи */}
        {tab === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Имя</TableCell>
                  <TableCell>Рефералов</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>{user.user_id}</TableCell>
                    <TableCell>@{user.username || '-'}</TableCell>
                    <TableCell>{user.first_name || '-'}</TableCell>
                    <TableCell>{user.referral_count || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_blacklisted ? 'Заблокирован' : 'Активен'}
                        color={user.is_blacklisted ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => user.is_blacklisted ? handleUnbanUser(user.user_id) : handleBanUser(user.user_id)}
                      >
                        {user.is_blacklisted ? <UnblockIcon /> : <BlockIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Рассылки */}
        {tab === 2 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setBroadcastDialogOpen(true)}
              >
                Создать рассылку
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Отправлено</TableCell>
                    <TableCell>Дата создания</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {broadcasts.map((broadcast) => (
                    <TableRow key={broadcast.id}>
                      <TableCell>{broadcast.id}</TableCell>
                      <TableCell>{broadcast.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={broadcast.status}
                          color={broadcast.status === 'sent' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{broadcast.sent_count || 0}</TableCell>
                      <TableCell>
                        {new Date(broadcast.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {broadcast.status === 'draft' && (
                            <IconButton
                              size="small"
                              onClick={() => handleSendBroadcast(broadcast.id)}
                              title="Отправить"
                            >
                              <SendIcon />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => setEditBroadcast(broadcast)}
                            title="Редактировать"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteBroadcast(broadcast.id)}
                            title="Удалить"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Автоворонки */}
        {tab === 3 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAutofunnelDialogOpen(true)}
              >
                Создать автоворонку
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Триггер</TableCell>
                    <TableCell>Задержка</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {autofunnels.map((funnel) => (
                    <TableRow key={funnel.id}>
                      <TableCell>{funnel.id}</TableCell>
                      <TableCell>{funnel.name}</TableCell>
                      <TableCell>{funnel.trigger_event}</TableCell>
                      <TableCell>{funnel.delay_hours}ч</TableCell>
                      <TableCell>
                        <Chip
                          label={funnel.is_active ? 'Активна' : 'Неактивна'}
                          color={funnel.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Switch
                            checked={funnel.is_active}
                            onChange={() => handleToggleAutofunnel(funnel.id, funnel.is_active)}
                          />
                          <IconButton
                            size="small"
                            onClick={() => setEditAutofunnel(funnel)}
                            title="Редактировать"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAutofunnel(funnel.id)}
                            title="Удалить"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Лид-магниты */}
        {tab === 4 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setLeadMagnetDialogOpen(true)}
              >
                Создать лид-магнит
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leadMagnets.map((lm) => (
                    <TableRow key={lm.id}>
                      <TableCell>{lm.id}</TableCell>
                      <TableCell>{lm.title}</TableCell>
                      <TableCell>{lm.type}</TableCell>
                      <TableCell>
                        <Chip
                          label={lm.is_active ? 'Активен' : 'Неактивен'}
                          color={lm.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {!lm.is_active && (
                            <Button
                              size="small"
                              onClick={() => handleActivateLeadMagnet(lm.id)}
                            >
                              Активировать
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => setEditLeadMagnet(lm)}
                            title="Редактировать"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLeadMagnet(lm.id)}
                            title="Удалить"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Розыгрыши */}
        {tab === 5 && (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setGiveawayDialogOpen(true)}
              >
                Создать розыгрыш
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell>Приз</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Дата окончания</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {giveaways.map((giveaway) => (
                    <TableRow key={giveaway.id}>
                      <TableCell>{giveaway.id}</TableCell>
                      <TableCell>{giveaway.title}</TableCell>
                      <TableCell>{giveaway.prize_description || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={giveaway.status}
                          color={giveaway.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(giveaway.end_date).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => setEditGiveaway(giveaway)}
                            title="Редактировать"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteGiveaway(giveaway.id)}
                            title="Удалить"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Экспорт */}
        {tab === 6 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Экспорт данных
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>CSV формат</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button variant="outlined" onClick={() => handleExport('all', 'csv')}>
                        Экспорт всех пользователей (CSV)
                      </Button>
                      <Button variant="outlined" onClick={() => handleExport('active', 'csv')}>
                        Экспорт активных пользователей (CSV)
                      </Button>
                      <Button variant="outlined" onClick={() => handleExport('refs', 'csv')}>
                        Экспорт топ рефералов (CSV)
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Excel формат</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Button variant="outlined" onClick={() => handleExport('all', 'excel')}>
                        Экспорт всех пользователей (Excel)
                      </Button>
                      <Button variant="outlined" onClick={() => handleExport('active', 'excel')}>
                        Экспорт активных пользователей (Excel)
                      </Button>
                      <Button variant="outlined" onClick={() => handleExport('refs', 'excel')}>
                        Экспорт топ рефералов (Excel)
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Настройки */}
        {tab === 7 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Настройки бота
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
              <TextField
                fullWidth
                label="ID канала"
                value={settings.channel_id || ''}
                onChange={(e) => setSettings({ ...settings, channel_id: e.target.value })}
                placeholder="-1001234567890"
                helperText="Введите ID канала (например: -1001234567890)"
              />
              <TextField
                fullWidth
                label="Username канала"
                value={settings.channel_username || ''}
                onChange={(e) => setSettings({ ...settings, channel_username: e.target.value })}
                placeholder="@channel_name"
                helperText="Введите username канала (например: @channel_name)"
              />
              <Button
                variant="contained"
                onClick={handleSaveSettings}
                sx={{ alignSelf: 'flex-start' }}
              >
                Сохранить настройки
              </Button>
            </Box>
          </Paper>
        )}
      </Container>
  );
}

export default BotAdmin;

