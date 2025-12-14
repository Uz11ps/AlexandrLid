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
  Visibility as ViewIcon
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

  return (
    <Layout>
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
                      {broadcast.status === 'draft' && (
                        <IconButton
                          size="small"
                          onClick={() => handleSendBroadcast(broadcast.id)}
                        >
                          <SendIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Автоворонки */}
        {tab === 3 && (
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
                      <Switch
                        checked={funnel.is_active}
                        onChange={() => handleToggleAutofunnel(funnel.id, funnel.is_active)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Лид-магниты */}
        {tab === 4 && (
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
                      {!lm.is_active && (
                        <Button
                          size="small"
                          onClick={() => handleActivateLeadMagnet(lm.id)}
                        >
                          Активировать
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Розыгрыши */}
        {tab === 5 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Приз</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Дата окончания</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
  );
}

export default BotAdmin;

