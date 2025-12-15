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
  FormControlLabel,
  List,
  ListItem,
  ListItemText
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
  const [error, setError] = useState(null);
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
    channel_username: '',
    user_rate_limit: 20,
    user_rate_window: 3600000,
    admin_rate_limit: 100,
    admin_rate_window: 3600000
  });
  const [editBroadcast, setEditBroadcast] = useState(null);
  const [editAutofunnel, setEditAutofunnel] = useState(null);
  const [editGiveaway, setEditGiveaway] = useState(null);
  const [editLeadMagnet, setEditLeadMagnet] = useState(null);
  const [winnersDialogOpen, setWinnersDialogOpen] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState(null);
  const [winners, setWinners] = useState([]);
  const [selectionType, setSelectionType] = useState('top');

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (tab === 0) {
          const response = await botAdminAPI.getStats();
          if (mounted) setStats(response.data);
        } else if (tab === 1) {
          const response = await botAdminAPI.getAllUsers();
          if (mounted) setUsers(response.data?.users || []);
        } else if (tab === 2) {
          const response = await botAdminAPI.getBroadcasts();
          if (mounted) setBroadcasts(response.data || []);
        } else if (tab === 3) {
          const response = await botAdminAPI.getAutofunnels();
          if (mounted) setAutofunnels(response.data || []);
        } else if (tab === 4) {
          const response = await botAdminAPI.getLeadMagnets();
          if (mounted) setLeadMagnets(response.data?.lead_magnets || []);
        } else if (tab === 5) {
          const response = await botAdminAPI.getGiveaways();
          if (mounted) setGiveaways(response.data || []);
        } else if (tab === 6) {
          // Экспорт - ничего не загружаем
        } else if (tab === 7) {
          const response = await botAdminAPI.getSettings();
          if (mounted) setSettings(response.data || { 
            channel_id: '', 
            channel_username: '',
            user_rate_limit: 20,
            user_rate_window: 3600000,
            admin_rate_limit: 100,
            admin_rate_window: 3600000
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (mounted) {
          setError(error.message || 'Ошибка при загрузке данных');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (tab === 0) {
        const response = await botAdminAPI.getStats();
        setStats(response.data);
      } else if (tab === 1) {
        const response = await botAdminAPI.getAllUsers();
        setUsers(response.data?.users || []);
      } else if (tab === 2) {
        const response = await botAdminAPI.getBroadcasts();
        setBroadcasts(response.data || []);
      } else if (tab === 3) {
        const response = await botAdminAPI.getAutofunnels();
        setAutofunnels(response.data || []);
      } else if (tab === 4) {
        const response = await botAdminAPI.getLeadMagnets();
        setLeadMagnets(response.data?.lead_magnets || []);
      } else if (tab === 5) {
        const response = await botAdminAPI.getGiveaways();
        setGiveaways(response.data || []);
      } else if (tab === 6) {
        // Экспорт - ничего не загружаем
      } else if (tab === 7) {
        const response = await botAdminAPI.getSettings();
        setSettings(response.data || { 
          channel_id: '', 
          channel_username: '',
          user_rate_limit: 20,
          user_rate_window: 3600000,
          admin_rate_limit: 100,
          admin_rate_window: 3600000
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Ошибка при загрузке данных');
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
      await botAdminAPI.updateChannelSettings({
        channel_id: settings.channel_id,
        channel_username: settings.channel_username
      });
      alert('Настройки канала сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ошибка при сохранении настроек');
    }
  };

  const handleCreateBroadcast = async () => {
    try {
      await botAdminAPI.createBroadcast(newBroadcast);
      setBroadcastDialogOpen(false);
      setNewBroadcast({ title: '', message_text: '', buttons: [], scheduled_at: '', target_audience: 'all' });
      loadData();
    } catch (error) {
      console.error('Error creating broadcast:', error);
      alert('Ошибка при создании рассылки');
    }
  };

  const handleCreateAutofunnel = async () => {
    try {
      await botAdminAPI.createAutofunnel(newAutofunnel);
      setAutofunnelDialogOpen(false);
      setNewAutofunnel({ name: '', trigger_event: 'registration', delay_hours: 0, message_text: '', is_active: true });
      loadData();
    } catch (error) {
      console.error('Error creating autofunnel:', error);
      alert('Ошибка при создании автоворонки');
    }
  };

  const handleCreateLeadMagnet = async () => {
    try {
      await botAdminAPI.createLeadMagnet(newLeadMagnet);
      setLeadMagnetDialogOpen(false);
      setNewLeadMagnet({ title: '', type: 'text', text_content: '', link_url: '', file_id: '', file_type: '' });
      loadData();
    } catch (error) {
      console.error('Error creating lead magnet:', error);
      alert('Ошибка при создании лид-магнита');
    }
  };

  const handleCreateGiveaway = async () => {
    try {
      await botAdminAPI.createGiveaway(newGiveaway);
      setGiveawayDialogOpen(false);
      setNewGiveaway({ title: '', description: '', prize_description: '', start_date: '', end_date: '', status: 'draft' });
      loadData();
    } catch (error) {
      console.error('Error creating giveaway:', error);
      alert('Ошибка при создании розыгрыша');
    }
  };

  return (
    <>
    <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom>
          Админка бота
        </Typography>
        
        {error && (
          <Box sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
            <Typography variant="body2">
              Ошибка: {error}
            </Typography>
            <Button 
              size="small" 
              onClick={() => {
                setError(null);
                loadData();
              }}
              sx={{ mt: 1 }}
            >
              Попробовать снова
            </Button>
          </Box>
        )}

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
                onClick={() => {
                  console.log('Opening broadcast dialog');
                  setBroadcastDialogOpen(true);
                }}
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
                onClick={() => {
                  console.log('Opening autofunnel dialog');
                  setAutofunnelDialogOpen(true);
                }}
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
                onClick={() => {
                  console.log('Opening lead magnet dialog');
                  setLeadMagnetDialogOpen(true);
                }}
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
                onClick={() => {
                  console.log('Opening giveaway dialog');
                  setGiveawayDialogOpen(true);
                }}
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
                          {(giveaway.status === 'ended' || giveaway.status === 'active') && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={async () => {
                                setSelectedGiveaway(giveaway);
                                try {
                                  const participantsResponse = await botAdminAPI.getGiveawayParticipants(giveaway.id);
                                  setWinners(participantsResponse.data || []);
                                  setWinnersDialogOpen(true);
                                } catch (error) {
                                  console.error('Error loading participants:', error);
                                  alert('Ошибка при загрузке участников');
                                }
                              }}
                            >
                              Победители
                            </Button>
                          )}
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
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Настройки канала
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Информация о времени сервера:</strong>
                    </Typography>
                    <Typography variant="caption" display="block">
                      Часовой пояс сервера: {settings.server_timezone || 'UTC'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Смещение UTC: {settings.server_utc_offset >= 0 ? '+' : ''}{settings.server_utc_offset || 0} часов
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Текущее время сервера: {settings.current_server_time_local || 'загрузка...'}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'warning.main' }}>
                      ⚠️ Время рассылок указывается в вашем локальном времени и автоматически конвертируется в UTC
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={handleSaveSettings}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Сохранить настройки канала
                  </Button>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Лимиты запросов
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                    Для пользователей
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Максимум запросов"
                    value={settings.user_rate_limit || 20}
                    onChange={(e) => setSettings({ ...settings, user_rate_limit: parseInt(e.target.value) || 20 })}
                    helperText="Количество запросов за период"
                    inputProps={{ min: 1 }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Период (окно времени)</InputLabel>
                    <Select
                      value={settings.user_rate_window || 3600000}
                      onChange={(e) => setSettings({ ...settings, user_rate_window: parseInt(e.target.value) })}
                      label="Период (окно времени)"
                    >
                      <MenuItem value={3600000}>1 час</MenuItem>
                      <MenuItem value={1800000}>30 минут</MenuItem>
                      <MenuItem value={900000}>15 минут</MenuItem>
                      <MenuItem value={600000}>10 минут</MenuItem>
                      <MenuItem value={300000}>5 минут</MenuItem>
                    </Select>
                  </FormControl>

                  <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 'bold' }}>
                    Для администраторов
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Максимум запросов"
                    value={settings.admin_rate_limit || 100}
                    onChange={(e) => setSettings({ ...settings, admin_rate_limit: parseInt(e.target.value) || 100 })}
                    helperText="Количество запросов за период"
                    inputProps={{ min: 1 }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Период (окно времени)</InputLabel>
                    <Select
                      value={settings.admin_rate_window || 3600000}
                      onChange={(e) => setSettings({ ...settings, admin_rate_window: parseInt(e.target.value) })}
                      label="Период (окно времени)"
                    >
                      <MenuItem value={3600000}>1 час</MenuItem>
                      <MenuItem value={1800000}>30 минут</MenuItem>
                      <MenuItem value={900000}>15 минут</MenuItem>
                      <MenuItem value={600000}>10 минут</MenuItem>
                      <MenuItem value={300000}>5 минут</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    onClick={async () => {
                      try {
                        await botAdminAPI.updateRateLimits({
                          user_rate_limit: settings.user_rate_limit,
                          user_rate_window: settings.user_rate_window,
                          admin_rate_limit: settings.admin_rate_limit,
                          admin_rate_window: settings.admin_rate_window
                        });
                        alert('Лимиты запросов сохранены');
                      } catch (error) {
                        console.error('Error saving rate limits:', error);
                        alert('Ошибка при сохранении лимитов');
                      }
                    }}
                    sx={{ alignSelf: 'flex-start', mt: 2 }}
                  >
                    Сохранить лимиты
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Диалог редактирования рассылки */}
        <Dialog open={!!editBroadcast} onClose={() => setEditBroadcast(null)} maxWidth="md" fullWidth>
          <DialogTitle>Редактировать рассылку</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={editBroadcast?.title || ''}
              onChange={(e) => setEditBroadcast({ ...editBroadcast, title: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Текст сообщения"
              value={editBroadcast?.message_text || ''}
              onChange={(e) => setEditBroadcast({ ...editBroadcast, message_text: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              type="datetime-local"
              label="Запланировать на (необязательно)"
              value={editBroadcast?.scheduled_at ? (() => {
                // Конвертируем UTC время из БД в локальное время для отображения
                // scheduled_at в БД хранится в UTC, нужно конвертировать в локальное время браузера
                const utcDate = new Date(editBroadcast.scheduled_at + 'Z'); // Добавляем Z для явного указания UTC
                // Получаем локальное время в формате YYYY-MM-DDTHH:mm для datetime-local
                const year = utcDate.getFullYear();
                const month = String(utcDate.getMonth() + 1).padStart(2, '0');
                const day = String(utcDate.getDate()).padStart(2, '0');
                const hours = String(utcDate.getHours()).padStart(2, '0');
                const minutes = String(utcDate.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
              })() : ''}
              onChange={(e) => setEditBroadcast({ ...editBroadcast, scheduled_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText={`Время указывается в вашем локальном времени (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Сервер: ${settings.server_timezone || 'UTC'}`}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={editBroadcast?.status || 'draft'}
                onChange={(e) => setEditBroadcast({ ...editBroadcast, status: e.target.value })}
              >
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="scheduled">Запланировано</MenuItem>
                <MenuItem value="sent">Отправлено</MenuItem>
                <MenuItem value="cancelled">Отменено</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditBroadcast(null)}>Отмена</Button>
            <Button
              onClick={async () => {
                try {
                  await botAdminAPI.updateBroadcast(editBroadcast.id, editBroadcast);
                  setEditBroadcast(null);
                  loadData();
                } catch (error) {
                  console.error('Error updating broadcast:', error);
                  alert('Ошибка при обновлении рассылки');
                }
              }}
              variant="contained"
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог редактирования автоворонки */}
        <Dialog open={!!editAutofunnel} onClose={() => setEditAutofunnel(null)} maxWidth="md" fullWidth>
          <DialogTitle>Редактировать автоворонку</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={editAutofunnel?.name || ''}
              onChange={(e) => setEditAutofunnel({ ...editAutofunnel, name: e.target.value })}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Триггер</InputLabel>
              <Select
                value={editAutofunnel?.trigger_event || 'registration'}
                onChange={(e) => setEditAutofunnel({ ...editAutofunnel, trigger_event: e.target.value })}
              >
                <MenuItem value="registration">Регистрация</MenuItem>
                <MenuItem value="new_referral">Новый реферал</MenuItem>
                <MenuItem value="no_subscription">Нет подписки</MenuItem>
                <MenuItem value="inactive">Неактивность</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Задержка (часы)"
              value={editAutofunnel?.delay_hours || 0}
              onChange={(e) => setEditAutofunnel({ ...editAutofunnel, delay_hours: parseInt(e.target.value) || 0 })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Текст сообщения"
              value={editAutofunnel?.message_text || ''}
              onChange={(e) => setEditAutofunnel({ ...editAutofunnel, message_text: e.target.value })}
              sx={{ mt: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editAutofunnel?.is_active || false}
                  onChange={(e) => setEditAutofunnel({ ...editAutofunnel, is_active: e.target.checked })}
                />
              }
              label="Активна"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditAutofunnel(null)}>Отмена</Button>
            <Button
              onClick={async () => {
                try {
                  await botAdminAPI.updateAutofunnel(editAutofunnel.id, editAutofunnel);
                  setEditAutofunnel(null);
                  loadData();
                } catch (error) {
                  console.error('Error updating autofunnel:', error);
                  alert('Ошибка при обновлении автоворонки');
                }
              }}
              variant="contained"
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог редактирования розыгрыша */}
        <Dialog open={!!editGiveaway} onClose={() => setEditGiveaway(null)} maxWidth="md" fullWidth>
          <DialogTitle>Редактировать розыгрыш</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={editGiveaway?.title || ''}
              onChange={(e) => setEditGiveaway({ ...editGiveaway, title: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Описание"
              value={editGiveaway?.description || ''}
              onChange={(e) => setEditGiveaway({ ...editGiveaway, description: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Описание приза"
              value={editGiveaway?.prize_description || ''}
              onChange={(e) => setEditGiveaway({ ...editGiveaway, prize_description: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              type="datetime-local"
              label="Дата начала"
              value={editGiveaway?.start_date ? new Date(editGiveaway.start_date).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEditGiveaway({ ...editGiveaway, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              type="datetime-local"
              label="Дата окончания"
              value={editGiveaway?.end_date ? new Date(editGiveaway.end_date).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEditGiveaway({ ...editGiveaway, end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={editGiveaway?.status || 'draft'}
                onChange={(e) => setEditGiveaway({ ...editGiveaway, status: e.target.value })}
              >
                <MenuItem value="draft">Черновик</MenuItem>
                <MenuItem value="active">Активен</MenuItem>
                <MenuItem value="ended">Завершен</MenuItem>
                <MenuItem value="cancelled">Отменен</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditGiveaway(null)}>Отмена</Button>
            <Button
              onClick={async () => {
                try {
                  await botAdminAPI.updateGiveaway(editGiveaway.id, editGiveaway);
                  setEditGiveaway(null);
                  loadData();
                } catch (error) {
                  console.error('Error updating giveaway:', error);
                  alert('Ошибка при обновлении розыгрыша');
                }
              }}
              variant="contained"
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог редактирования лид-магнита */}
        <Dialog open={!!editLeadMagnet} onClose={() => setEditLeadMagnet(null)} maxWidth="md" fullWidth>
          <DialogTitle>Редактировать лид-магнит</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={editLeadMagnet?.title || ''}
              onChange={(e) => setEditLeadMagnet({ ...editLeadMagnet, title: e.target.value })}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Тип</InputLabel>
              <Select
                value={editLeadMagnet?.type || 'text'}
                onChange={(e) => setEditLeadMagnet({ ...editLeadMagnet, type: e.target.value })}
              >
                <MenuItem value="text">Текст</MenuItem>
                <MenuItem value="link">Ссылка</MenuItem>
                <MenuItem value="file">Файл</MenuItem>
              </Select>
            </FormControl>
            {editLeadMagnet?.type === 'text' && (
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Текст"
                value={editLeadMagnet?.text_content || ''}
                onChange={(e) => setEditLeadMagnet({ ...editLeadMagnet, text_content: e.target.value })}
                sx={{ mt: 2 }}
              />
            )}
            {editLeadMagnet?.type === 'link' && (
              <TextField
                fullWidth
                label="URL ссылки"
                value={editLeadMagnet?.link_url || ''}
                onChange={(e) => setEditLeadMagnet({ ...editLeadMagnet, link_url: e.target.value })}
                sx={{ mt: 2 }}
              />
            )}
            {editLeadMagnet?.type === 'file' && (
              <>
                <TextField
                  fullWidth
                  label="File ID (из Telegram)"
                  value={editLeadMagnet?.file_id || ''}
                  onChange={(e) => setEditLeadMagnet({ ...editLeadMagnet, file_id: e.target.value })}
                  sx={{ mt: 2 }}
                />
                <TextField
                  fullWidth
                  label="Тип файла"
                  value={editLeadMagnet?.file_type || ''}
                  onChange={(e) => setEditLeadMagnet({ ...editLeadMagnet, file_type: e.target.value })}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditLeadMagnet(null)}>Отмена</Button>
            <Button
              onClick={async () => {
                try {
                  await botAdminAPI.updateLeadMagnet(editLeadMagnet.id, editLeadMagnet);
                  setEditLeadMagnet(null);
                  loadData();
                } catch (error) {
                  console.error('Error updating lead magnet:', error);
                  alert('Ошибка при обновлении лид-магнита');
                }
              }}
              variant="contained"
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог определения победителей розыгрыша */}
        <Dialog open={winnersDialogOpen} onClose={() => setWinnersDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Определить победителей: {selectedGiveaway?.title}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Участников: {winners.length}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Способ выбора</InputLabel>
              <Select
                value={selectionType}
                onChange={(e) => setSelectionType(e.target.value)}
                label="Способ выбора"
              >
                <MenuItem value="top">Топ по рефералам</MenuItem>
                <MenuItem value="random">Случайный выбор</MenuItem>
                <MenuItem value="combined">Комбинированный (50% топ, 50% случайно)</MenuItem>
              </Select>
            </FormControl>
            {winners.length > 0 && (
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Участники (отсортированы по количеству рефералов):
                </Typography>
                <List>
                  {winners.slice(0, 20).map((participant, index) => (
                    <ListItem key={participant.user_id}>
                      <ListItemText
                        primary={`${index + 1}. ${participant.username ? `@${participant.username}` : participant.first_name || `ID: ${participant.user_id}`}`}
                        secondary={`Рефералов: ${participant.referral_count}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setWinnersDialogOpen(false);
              setSelectedGiveaway(null);
              setWinners([]);
              setSelectionType('top');
            }}>Отмена</Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  const response = await botAdminAPI.selectGiveawayWinners(selectedGiveaway.id, selectionType);
                  alert(`Победители определены:\n${response.data.winners.map((w, i) => `${i + 1}. ${w.username || w.first_name || `ID: ${w.user_id}`} - ${w.referral_count} рефералов`).join('\n')}`);
                  setWinnersDialogOpen(false);
                  setSelectedGiveaway(null);
                  setWinners([]);
                  setSelectionType('top');
                  loadData();
                } catch (error) {
                  console.error('Error selecting winners:', error);
                  alert('Ошибка при определении победителей: ' + (error.response?.data?.error || error.message));
                }
              }}
            >
              Определить победителей
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      {/* Диалоги создания - должны быть вне Container */}
      {/* Диалог создания рассылки */}
      <Dialog 
        open={broadcastDialogOpen} 
        onClose={() => {
          console.log('Closing broadcast dialog');
          setBroadcastDialogOpen(false);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Создать рассылку</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newBroadcast.title}
            onChange={(e) => setNewBroadcast({ ...newBroadcast, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Текст сообщения"
            value={newBroadcast.message_text}
            onChange={(e) => setNewBroadcast({ ...newBroadcast, message_text: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="datetime-local"
            label="Запланировать на (необязательно)"
            value={newBroadcast.scheduled_at}
            onChange={(e) => setNewBroadcast({ ...newBroadcast, scheduled_at: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText={`Время указывается в вашем локальном времени (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Сервер: ${settings.server_timezone || 'UTC'}`}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Аудитория</InputLabel>
            <Select
              value={newBroadcast.target_audience}
              onChange={(e) => setNewBroadcast({ ...newBroadcast, target_audience: e.target.value })}
            >
              <MenuItem value="all">Все пользователи</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBroadcastDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleCreateBroadcast}
            variant="contained"
            disabled={!newBroadcast.title || !newBroadcast.message_text}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания автоворонки */}
      <Dialog 
        open={autofunnelDialogOpen} 
        onClose={() => {
          console.log('Closing autofunnel dialog');
          setAutofunnelDialogOpen(false);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Создать автоворонку</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newAutofunnel.name}
            onChange={(e) => setNewAutofunnel({ ...newAutofunnel, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Триггер</InputLabel>
            <Select
              value={newAutofunnel.trigger_event}
              onChange={(e) => setNewAutofunnel({ ...newAutofunnel, trigger_event: e.target.value })}
            >
              <MenuItem value="registration">Регистрация</MenuItem>
              <MenuItem value="new_referral">Новый реферал</MenuItem>
              <MenuItem value="no_subscription">Нет подписки</MenuItem>
              <MenuItem value="inactive">Неактивность</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Задержка (часы)"
            value={newAutofunnel.delay_hours}
            onChange={(e) => setNewAutofunnel({ ...newAutofunnel, delay_hours: parseInt(e.target.value) || 0 })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Текст сообщения"
            value={newAutofunnel.message_text}
            onChange={(e) => setNewAutofunnel({ ...newAutofunnel, message_text: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newAutofunnel.is_active}
                onChange={(e) => setNewAutofunnel({ ...newAutofunnel, is_active: e.target.checked })}
              />
            }
            label="Активна"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutofunnelDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleCreateAutofunnel}
            variant="contained"
            disabled={!newAutofunnel.name || !newAutofunnel.message_text}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания лид-магнита */}
      <Dialog 
        open={leadMagnetDialogOpen} 
        onClose={() => {
          console.log('Closing lead magnet dialog');
          setLeadMagnetDialogOpen(false);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Создать лид-магнит</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newLeadMagnet.title}
            onChange={(e) => setNewLeadMagnet({ ...newLeadMagnet, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Тип</InputLabel>
            <Select
              value={newLeadMagnet.type}
              onChange={(e) => setNewLeadMagnet({ ...newLeadMagnet, type: e.target.value })}
            >
              <MenuItem value="text">Текст</MenuItem>
              <MenuItem value="link">Ссылка</MenuItem>
              <MenuItem value="file">Файл</MenuItem>
            </Select>
          </FormControl>
          {newLeadMagnet.type === 'text' && (
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Текст"
              value={newLeadMagnet.text_content}
              onChange={(e) => setNewLeadMagnet({ ...newLeadMagnet, text_content: e.target.value })}
              sx={{ mt: 2 }}
            />
          )}
          {newLeadMagnet.type === 'link' && (
            <TextField
              fullWidth
              label="URL ссылки"
              value={newLeadMagnet.link_url}
              onChange={(e) => setNewLeadMagnet({ ...newLeadMagnet, link_url: e.target.value })}
              sx={{ mt: 2 }}
            />
          )}
          {newLeadMagnet.type === 'file' && (
            <>
              <TextField
                fullWidth
                label="File ID (из Telegram)"
                value={newLeadMagnet.file_id}
                onChange={(e) => setNewLeadMagnet({ ...newLeadMagnet, file_id: e.target.value })}
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth
                label="Тип файла"
                value={newLeadMagnet.file_type}
                onChange={(e) => setNewLeadMagnet({ ...newLeadMagnet, file_type: e.target.value })}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeadMagnetDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleCreateLeadMagnet}
            variant="contained"
            disabled={!newLeadMagnet.title || (newLeadMagnet.type === 'text' && !newLeadMagnet.text_content) || (newLeadMagnet.type === 'link' && !newLeadMagnet.link_url)}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания розыгрыша */}
      <Dialog 
        open={giveawayDialogOpen} 
        onClose={() => {
          console.log('Closing giveaway dialog');
          setGiveawayDialogOpen(false);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Создать розыгрыш</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newGiveaway.title}
            onChange={(e) => setNewGiveaway({ ...newGiveaway, title: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Описание"
            value={newGiveaway.description}
            onChange={(e) => setNewGiveaway({ ...newGiveaway, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Описание приза"
            value={newGiveaway.prize_description}
            onChange={(e) => setNewGiveaway({ ...newGiveaway, prize_description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="datetime-local"
            label="Дата начала"
            value={newGiveaway.start_date}
            onChange={(e) => setNewGiveaway({ ...newGiveaway, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="datetime-local"
            label="Дата окончания"
            value={newGiveaway.end_date}
            onChange={(e) => setNewGiveaway({ ...newGiveaway, end_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={newGiveaway.status}
              onChange={(e) => setNewGiveaway({ ...newGiveaway, status: e.target.value })}
            >
              <MenuItem value="draft">Черновик</MenuItem>
              <MenuItem value="active">Активен</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGiveawayDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleCreateGiveaway}
            variant="contained"
            disabled={!newGiveaway.title || !newGiveaway.end_date}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default BotAdmin;

