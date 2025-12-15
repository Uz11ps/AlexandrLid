import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Avatar,
  IconButton
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { leadsAPI } from '../api/leads';
import { tasksAPI } from '../api/tasks';
import { funnelAPI } from '../api/funnel';

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

function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [funnelStages, setFunnelStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [editingReminder, setEditingReminder] = useState(null);
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'normal'
  });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadFunnelStages();
    loadLead();
    loadReminders();
  }, [id]);

  const loadReminders = async () => {
    try {
      const response = await tasksAPI.getAll({ lead_id: id, task_type: 'reminder' });
      setReminders(response.data.tasks || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const loadFunnelStages = async () => {
    try {
      const response = await funnelAPI.getStages();
      setFunnelStages(response.data || []);
    } catch (error) {
      console.error('Error loading funnel stages:', error);
    }
  };

  const loadLead = async () => {
    try {
      const response = await leadsAPI.getById(id);
      setLead(response.data);
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (field, value) => {
    try {
      await leadsAPI.update(id, { [field]: value });
      setLead({ ...lead, [field]: value });
      setSuccess('Данные обновлены');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      await leadsAPI.addComment(id, commentText);
      setCommentText('');
      loadLead();
      setSuccess('Комментарий добавлен');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await leadsAPI.sendMessage(id, messageText);
      setMessageText('');
      setMessageDialogOpen(false);
      setSuccess('Сообщение отправлено');
      setTimeout(() => setSuccess(''), 3000);
      loadLead();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.error || 'Ошибка отправки сообщения');
    }
  };

  const handleCreateTask = async () => {
    if (!taskData.title || !taskData.due_date) return;

    try {
      const dueDateTime = taskData.due_time 
        ? `${taskData.due_date}T${taskData.due_time}:00`
        : `${taskData.due_date}T12:00:00`;
      
      await tasksAPI.create({
        ...taskData,
        lead_id: parseInt(id),
        task_type: 'reminder',
        due_date: dueDateTime
      });
      setTaskData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        priority: 'normal'
      });
      setTaskDialogOpen(false);
      setEditingReminder(null);
      setSuccess('Напоминание создано');
      setTimeout(() => setSuccess(''), 3000);
      loadReminders();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Ошибка при создании напоминания');
    }
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    const dueDate = new Date(reminder.due_date);
    setTaskData({
      title: reminder.title || '',
      description: reminder.description || '',
      due_date: dueDate.toISOString().split('T')[0],
      due_time: reminder.due_time || '',
      priority: reminder.priority || 'normal'
    });
    setTaskDialogOpen(true);
  };

  const handleUpdateReminder = async () => {
    if (!taskData.title || !taskData.due_date) return;

    try {
      const dueDateTime = taskData.due_time 
        ? `${taskData.due_date}T${taskData.due_time}:00`
        : `${taskData.due_date}T12:00:00`;
      
      await tasksAPI.update(editingReminder.id, {
        ...taskData,
        due_date: dueDateTime
      });
      setTaskData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        priority: 'normal'
      });
      setTaskDialogOpen(false);
      setEditingReminder(null);
      setSuccess('Напоминание обновлено');
      setTimeout(() => setSuccess(''), 3000);
      loadReminders();
    } catch (error) {
      console.error('Error updating reminder:', error);
      alert('Ошибка при обновлении напоминания');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это напоминание?')) return;
    try {
      await tasksAPI.delete(reminderId);
      setSuccess('Напоминание удалено');
      setTimeout(() => setSuccess(''), 3000);
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Ошибка при удалении напоминания');
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      await tasksAPI.update(reminderId, { status: 'completed' });
      setSuccess('Напоминание выполнено');
      setTimeout(() => setSuccess(''), 3000);
      loadReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
      alert('Ошибка при обновлении статуса');
    }
  };

  const handleStageChange = async (newStage) => {
    try {
      await funnelAPI.updateLeadStage(id, newStage);
      setLead({ ...lead, funnel_stage: newStage });
      setSuccess('Этап воронки обновлен');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!lead) {
    return (
      <Container>
        <Typography>Лид не найден</Typography>
      </Container>
    );
  }

  return (
    <>
    <Container maxWidth="lg">
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Основная информация
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="ФИО"
                    value={lead.fio || ''}
                    onChange={(e) => handleUpdate('fio', e.target.value)}
                    onBlur={(e) => handleUpdate('fio', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    value={lead.phone || ''}
                    onChange={(e) => handleUpdate('phone', e.target.value)}
                    onBlur={(e) => handleUpdate('phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={lead.email || ''}
                    onChange={(e) => handleUpdate('email', e.target.value)}
                    onBlur={(e) => handleUpdate('email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Telegram"
                    value={lead.telegram_username ? `@${lead.telegram_username}` : ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Этап воронки</InputLabel>
                    <Select
                      value={lead.funnel_stage || ''}
                      label="Этап воронки"
                      onChange={(e) => handleStageChange(e.target.value)}
                    >
                      {funnelStages.map(stage => (
                        <MenuItem key={stage.id} value={stage.name}>{stage.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Приоритет</InputLabel>
                    <Select
                      value={lead.priority || 'холодный'}
                      label="Приоритет"
                      onChange={(e) => handleUpdate('priority', e.target.value)}
                    >
                      <MenuItem value="горячий">Горячий</MenuItem>
                      <MenuItem value="теплый">Теплый</MenuItem>
                      <MenuItem value="холодный">Холодный</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Заметки"
                    value={lead.notes || ''}
                    onChange={(e) => handleUpdate('notes', e.target.value)}
                    onBlur={(e) => handleUpdate('notes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                  💬 История переписки
                </Typography>
                {lead.interactions && lead.interactions.filter(i => i.interaction_type === 'telegram_message').length > 0 && (
                  <Chip 
                    label={`${lead.interactions.filter(i => i.interaction_type === 'telegram_message').length} сообщений`}
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
              <Box sx={{ maxHeight: 500, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                {lead.interactions && lead.interactions.filter(interaction => interaction.interaction_type === 'telegram_message').length > 0 ? (
                  <Box>
                    {lead.interactions
                      .filter(interaction => interaction.interaction_type === 'telegram_message')
                      .map((interaction) => {
                        try {
                          const interactionData = typeof interaction.interaction_data === 'string' 
                            ? JSON.parse(interaction.interaction_data) 
                            : (interaction.interaction_data || {});
                          const isFromManager = !!interaction.manager_id;
                          
                          return (
                            <Box
                              key={interaction.id}
                              sx={{
                                mb: 2,
                                p: 2,
                                bgcolor: isFromManager ? 'primary.light' : 'grey.100',
                                borderRadius: 2,
                                borderLeft: `4px solid ${isFromManager ? 'primary.main' : 'grey.400'}`,
                                ml: isFromManager ? 4 : 0,
                                mr: isFromManager ? 0 : 4
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: isFromManager ? 'primary.main' : 'grey.500' }}>
                                    {isFromManager ? 'М' : 'П'}
                                  </Avatar>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {isFromManager ? (interaction.manager_name || 'Менеджер') : 'Пользователь'}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                  {new Date(interaction.created_at).toLocaleString('ru-RU')}
                                </Typography>
                              </Box>
                              <Typography variant="body1" sx={{ mb: 1 }}>
                                {interactionData?.message_text || interaction.notes || 'Сообщение'}
                              </Typography>
                              {interactionData?.file_id && (
                                <Chip 
                                  icon={interactionData.message_type === 'photo' ? '📷' : interactionData.message_type === 'video' ? '🎥' : '📎'}
                                  label={interactionData.message_type === 'photo' ? 'Фото' : interactionData.message_type === 'video' ? 'Видео' : 'Документ'} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ mt: 1 }}
                                />
                              )}
                            </Box>
                          );
                        } catch (error) {
                          console.error('Error parsing interaction data:', error, interaction);
                          return (
                            <Box
                              key={interaction.id}
                              sx={{
                                mb: 2,
                                p: 2,
                                bgcolor: 'grey.100',
                                borderRadius: 2,
                                borderLeft: '4px solid grey.400'
                              }}
                            >
                              <Typography variant="body2" color="error">
                                Ошибка отображения сообщения
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {new Date(interaction.created_at).toLocaleString('ru-RU')}
                              </Typography>
                            </Box>
                          );
                        }
                      })}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      📭 История переписки пуста
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Сообщения от пользователя будут отображаться здесь автоматически
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                  Напоминания
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setEditingReminder(null);
                    setTaskData({
                      title: '',
                      description: '',
                      due_date: '',
                      due_time: '',
                      priority: 'normal'
                    });
                    setTaskDialogOpen(true);
                  }}
                >
                  Добавить
                </Button>
              </Box>
              {reminders.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                  Напоминания не добавлены
                </Typography>
              ) : (
                <List>
                  {reminders.map((reminder) => (
                    <ListItem
                      key={reminder.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: reminder.status === 'completed' ? 'action.disabledBackground' : 'background.paper'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body1" fontWeight="bold">
                              {reminder.title}
                            </Typography>
                            <Chip
                              label={reminder.status === 'completed' ? 'Выполнено' : reminder.status}
                              color={reminder.status === 'completed' ? 'success' : 'default'}
                              size="small"
                            />
                            <Chip
                              label={reminder.priority}
                              color={reminder.priority === 'urgent' ? 'error' : reminder.priority === 'high' ? 'warning' : 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {reminder.description}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(reminder.due_date).toLocaleString('ru-RU')}
                              {reminder.due_time && ` ${reminder.due_time}`}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {reminder.status !== 'completed' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleCompleteReminder(reminder.id)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleEditReminder(reminder)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteReminder(reminder.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Комментарии менеджеров
              </Typography>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Добавить комментарий..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button
                  variant="contained"
                  onClick={handleAddComment}
                  sx={{ mt: 1 }}
                >
                  Добавить комментарий
                </Button>
              </Box>
              <List>
                {lead.comments?.map((comment) => (
                  <ListItem key={comment.id}>
                    <ListItemText
                      primary={comment.comment_text}
                      secondary={`${comment.manager_name || 'Менеджер'} - ${new Date(comment.created_at).toLocaleString('ru-RU')}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Действия
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => setMessageDialogOpen(true)}
                  disabled={!lead.user_id}
                >
                  Написать в Telegram
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                История взаимодействий
              </Typography>
              <List>
                {lead.interactions?.slice(0, 10).map((interaction) => (
                  <ListItem key={interaction.id}>
                    <ListItemText
                      primary={interaction.interaction_type}
                      secondary={new Date(interaction.created_at).toLocaleString('ru-RU')}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)}>
        <DialogTitle>Отправить сообщение в Telegram</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Введите сообщение..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSendMessage} variant="contained">
            Отправить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onClose={() => {
        setTaskDialogOpen(false);
        setEditingReminder(null);
        setTaskData({
          title: '',
          description: '',
          due_date: '',
          due_time: '',
          priority: 'normal'
        });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingReminder ? 'Редактировать напоминание' : 'Создать напоминание'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={taskData.title}
            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Описание"
            value={taskData.description}
            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="date"
            label="Дата"
            value={taskData.due_date}
            onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="time"
            label="Время"
            value={taskData.due_time}
            onChange={(e) => setTaskData({ ...taskData, due_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={taskData.priority}
              label="Приоритет"
              onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
            >
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="normal">Обычный</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
              <MenuItem value="urgent">Срочный</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTaskDialogOpen(false);
            setEditingReminder(null);
            setTaskData({
              title: '',
              description: '',
              due_date: '',
              due_time: '',
              priority: 'normal'
            });
          }}>Отмена</Button>
          <Button 
            onClick={editingReminder ? handleUpdateReminder : handleCreateTask} 
            variant="contained"
          >
            {editingReminder ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LeadDetail;

