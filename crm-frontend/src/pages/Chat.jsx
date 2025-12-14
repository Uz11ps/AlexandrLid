import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { ticketsAPI } from '../api/tickets';
import { leadsAPI } from '../api/leads';

function Chat() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [newTicket, setNewTicket] = useState({
    user_id: '',
    subject: '',
    priority: 'normal'
  });
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadTickets();
    loadLeads();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketMessages(selectedTicket.id);
      // Обновлять сообщения каждые 5 секунд
      const interval = setInterval(() => {
        loadTicketMessages(selectedTicket.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await ticketsAPI.getAll(params);
      setTickets(response.data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await leadsAPI.getAll({ limit: 100 });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadTicketMessages = async (ticketId) => {
    try {
      const response = await ticketsAPI.getById(ticketId);
      setSelectedTicket(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const response = await ticketsAPI.create(newTicket);
      setCreateDialogOpen(false);
      setNewTicket({ user_id: '', subject: '', priority: 'normal' });
      loadTickets();
      setSelectedTicket(response.data);
      loadTicketMessages(response.data.id);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Ошибка при создании тикета');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      await ticketsAPI.sendMessage(selectedTicket.id, newMessage);
      setNewMessage('');
      loadTicketMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка при отправке сообщения');
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      await ticketsAPI.update(ticketId, { status });
      loadTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        loadTicketMessages(ticketId);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'info';
      case 'in_progress': return 'warning';
      case 'closed': return 'default';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Чат / Тикеты</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={statusFilter}
              label="Статус"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="open">Открытые</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="closed">Закрытые</MenuItem>
              <MenuItem value="resolved">Решенные</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Создать тикет
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Список тикетов */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, maxHeight: '80vh', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Тикеты ({tickets.length})
            </Typography>
            <List>
              {tickets.map((ticket) => (
                <ListItem
                  key={ticket.id}
                  button
                  selected={selectedTicket?.id === ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.light'
                      }
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight="bold">
                          {ticket.subject || `Тикет #${ticket.id}`}
                        </Typography>
                        <Chip
                          label={ticket.status}
                          color={getStatusColor(ticket.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {ticket.user_first_name || ticket.user_username || `ID: ${ticket.user_id}`}
                        </Typography>
                        {ticket.messages_count > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Сообщений: {ticket.messages_count}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Переписка */}
        <Grid item xs={12} md={8}>
          {selectedTicket ? (
            <Paper sx={{ p: 2, height: '80vh', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6">
                    {selectedTicket.subject || `Тикет #${selectedTicket.id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Пользователь: {selectedTicket.user_first_name || selectedTicket.user_username || `ID: ${selectedTicket.user_id}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={selectedTicket.priority}
                    color={getPriorityColor(selectedTicket.priority)}
                    size="small"
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                    >
                      <MenuItem value="open">Открыт</MenuItem>
                      <MenuItem value="in_progress">В работе</MenuItem>
                      <MenuItem value="resolved">Решен</MenuItem>
                      <MenuItem value="closed">Закрыт</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Сообщения */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    sx={{
                      mb: 2,
                      display: 'flex',
                      justifyContent: message.sender_type === 'user' ? 'flex-start' : 'flex-end'
                    }}
                  >
                    <Card
                      sx={{
                        maxWidth: '70%',
                        bgcolor: message.sender_type === 'user' ? 'grey.100' : 'primary.light',
                        color: message.sender_type === 'user' ? 'text.primary' : 'primary.contrastText'
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          {message.sender_name || (message.sender_type === 'user' ? 'Пользователь' : 'Менеджер')}
                        </Typography>
                        <Typography variant="body1">{message.message_text}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.created_at).toLocaleString('ru-RU')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>

              {/* Поле ввода */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Введите сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  <SendIcon />
                </Button>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Выберите тикет для просмотра переписки
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Диалог создания тикета */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать тикет</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Пользователь</InputLabel>
            <Select
              value={newTicket.user_id}
              onChange={(e) => setNewTicket({ ...newTicket, user_id: e.target.value })}
            >
              {leads.filter(l => l.user_id).map(lead => (
                <MenuItem key={lead.user_id} value={lead.user_id}>
                  {lead.fio || lead.telegram_username || `ID: ${lead.user_id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Тема"
            value={newTicket.subject}
            onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={newTicket.priority}
              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
            >
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="normal">Обычный</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
              <MenuItem value="urgent">Срочный</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateTicket} variant="contained" disabled={!newTicket.user_id}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Chat;

