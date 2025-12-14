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
  LinearProgress
} from '@mui/material';
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
  }, [id]);

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
      await tasksAPI.create({
        ...taskData,
        lead_id: parseInt(id),
        task_type: 'reminder'
      });
      setTaskData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        priority: 'normal'
      });
      setTaskDialogOpen(false);
      setSuccess('Задача создана');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating task:', error);
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

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Комментарии
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
                <Button
                  variant="outlined"
                  onClick={() => setTaskDialogOpen(true)}
                >
                  Создать напоминание
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
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)}>
        <DialogTitle>Создать напоминание</DialogTitle>
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
          <Button onClick={() => setTaskDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LeadDetail;

