import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { tasksAPI } from '../api/tasks';
import { managersAPI } from '../api/managers';
import { useAuth } from '../contexts/AuthContext';

function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState(0);
  const [tasks, setTasks] = useState({
    today: [],
    tomorrow: [],
    upcoming: []
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [managers, setManagers] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'reminder',
    due_date: '',
    due_time: '',
    priority: 'normal',
    lead_id: '',
    manager_id: user?.id || ''
  });

  useEffect(() => {
    loadTasks();
    if (isAdmin && createDialogOpen) {
      loadManagers();
    }
  }, [tab, createDialogOpen]);

  const loadTasks = async () => {
    try {
      const [todayRes, tomorrowRes, upcomingRes] = await Promise.all([
        tasksAPI.getAll({ date_filter: 'today' }),
        tasksAPI.getAll({ date_filter: 'tomorrow' }),
        tasksAPI.getAll({ date_filter: 'upcoming' })
      ]);

      setTasks({
        today: todayRes.data.tasks || [],
        tomorrow: tomorrowRes.data.tasks || [],
        upcoming: upcomingRes.data.tasks || []
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await managersAPI.getAll();
      setManagers(response.data || []);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'new': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      default: return 'default';
    }
  };

  const handleTaskClick = async (task) => {
    try {
      // Загружаем полную информацию о задаче
      const response = await tasksAPI.getById(task.id);
      setSelectedTask(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading task details:', error);
      alert('Ошибка при загрузке задачи');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      setSelectedTask({ ...selectedTask, status: newStatus });
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Ошибка при обновлении статуса задачи');
    }
  };

  const renderTaskList = (taskList) => {
    if (taskList.length === 0) {
      return <Typography color="text.secondary">Нет задач</Typography>;
    }

    return (
      <List>
        {taskList.map((task) => (
          <ListItem
            key={task.id}
            button
            onClick={() => handleTaskClick(task)}
          >
            <ListItemText
              primary={task.title}
              secondary={
                <>
                  {task.lead_name && (
                    <Typography component="span" variant="body2" color="text.secondary">
                      Лид: {task.lead_name} | 
                    </Typography>
                  )}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {new Date(task.due_date).toLocaleDateString('ru-RU')} {task.due_time || ''}
                  </Typography>
                </>
              }
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={task.status === 'new' ? 'Новая' : task.status === 'in_progress' ? 'В работе' : task.status === 'completed' ? 'Выполнена' : task.status}
                color={getStatusColor(task.status)}
                size="small"
              />
              <Chip
                label={task.priority === 'low' ? 'Низкий' : task.priority === 'normal' ? 'Средний' : task.priority === 'high' ? 'Высокий' : task.priority === 'urgent' ? 'Срочный' : task.priority}
                color={getPriorityColor(task.priority)}
                size="small"
              />
            </Box>
          </ListItem>
        ))}
      </List>
    );
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.title || !newTask.due_date) {
        alert('Пожалуйста, заполните название и дату выполнения');
        return;
      }

      const taskData = {
        ...newTask,
        manager_id: newTask.manager_id || user?.id
      };

      await tasksAPI.create(taskData);
      setCreateDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'reminder',
        due_date: '',
        due_time: '',
        priority: 'normal',
        lead_id: '',
        manager_id: user?.id || ''
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Ошибка при создании задачи: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Задачи</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Создать задачу
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
            <Tab label={`Сегодня (${tasks.today.length})`} />
            <Tab label={`Завтра (${tasks.tomorrow.length})`} />
            <Tab label={`Предстоящие (${tasks.upcoming.length})`} />
          </Tabs>

          <Box sx={{ mt: 3 }}>
            {tab === 0 && renderTaskList(tasks.today)}
            {tab === 1 && renderTaskList(tasks.tomorrow)}
            {tab === 2 && renderTaskList(tasks.upcoming)}
          </Box>
        </Paper>

        {/* Dialog создания задачи */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Создать задачу</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Описание"
              multiline
              rows={3}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Тип задачи</InputLabel>
              <Select
                value={newTask.task_type}
                onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
              >
                <MenuItem value="call">Звонок</MenuItem>
                <MenuItem value="send_materials">Отправить материалы</MenuItem>
                <MenuItem value="presentation">Презентация</MenuItem>
                <MenuItem value="reminder">Напоминание</MenuItem>
                <MenuItem value="custom">Кастомная</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Дата выполнения"
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Время"
              type="time"
              value={newTask.due_time}
              onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              >
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="normal">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
                <MenuItem value="urgent">Срочный</MenuItem>
              </Select>
            </FormControl>
            {isAdmin && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Менеджер</InputLabel>
                <Select
                  value={newTask.manager_id || ''}
                  onChange={(e) => setNewTask({ ...newTask, manager_id: e.target.value })}
                  label="Менеджер"
                >
                  {managers.map((manager) => (
                    <MenuItem key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateTask} variant="contained">
              Создать
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog просмотра задачи */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Детали задачи</Typography>
              {selectedTask && (
                <Chip
                  label={selectedTask.status === 'new' ? 'Новая' : selectedTask.status === 'in_progress' ? 'В работе' : selectedTask.status === 'completed' ? 'Выполнена' : selectedTask.status}
                  color={getStatusColor(selectedTask.status)}
                  size="small"
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedTask && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>{selectedTask.title}</Typography>
                
                {selectedTask.description && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">Описание:</Typography>
                    <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {selectedTask.description}
                    </Typography>
                  </Box>
                )}

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Тип задачи:</Typography>
                    <Typography variant="body1">
                      {selectedTask.task_type === 'call' ? 'Звонок' :
                       selectedTask.task_type === 'send_materials' ? 'Отправить материалы' :
                       selectedTask.task_type === 'presentation' ? 'Презентация' :
                       selectedTask.task_type === 'reminder' ? 'Напоминание' :
                       selectedTask.task_type === 'custom' ? 'Кастомная' : selectedTask.task_type}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Приоритет:</Typography>
                    <Chip
                      label={selectedTask.priority === 'low' ? 'Низкий' : selectedTask.priority === 'normal' ? 'Средний' : selectedTask.priority === 'high' ? 'Высокий' : selectedTask.priority === 'urgent' ? 'Срочный' : selectedTask.priority}
                      color={getPriorityColor(selectedTask.priority)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Дата выполнения:</Typography>
                    <Typography variant="body1">
                      {new Date(selectedTask.due_date).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                      {selectedTask.due_time && ` в ${selectedTask.due_time}`}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Статус:</Typography>
                    <Typography variant="body1">
                      {selectedTask.status === 'new' ? 'Новая' :
                       selectedTask.status === 'in_progress' ? 'В работе' :
                       selectedTask.status === 'completed' ? 'Выполнена' : selectedTask.status}
                    </Typography>
                  </Grid>
                  {selectedTask.manager_name && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Менеджер:</Typography>
                      <Typography variant="body1">{selectedTask.manager_name}</Typography>
                    </Grid>
                  )}
                  {selectedTask.lead_name && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Лид:</Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
                        onClick={() => {
                          setViewDialogOpen(false);
                          navigate(`/leads/${selectedTask.lead_id}`);
                        }}
                      >
                        {selectedTask.lead_name}
                      </Typography>
                    </Grid>
                  )}
                  {selectedTask.created_at && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Создана:</Typography>
                      <Typography variant="body1">
                        {new Date(selectedTask.created_at).toLocaleString('ru-RU')}
                      </Typography>
                    </Grid>
                  )}
                  {selectedTask.completed_at && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Выполнена:</Typography>
                      <Typography variant="body1">
                        {new Date(selectedTask.completed_at).toLocaleString('ru-RU')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {selectedTask.status !== 'new' && (
                    <Button
                      variant="outlined"
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'new')}
                    >
                      Вернуть в "Новая"
                    </Button>
                  )}
                  {selectedTask.status !== 'in_progress' && (
                    <Button
                      variant="outlined"
                      color="info"
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'in_progress')}
                    >
                      Взять в работу
                    </Button>
                  )}
                  {selectedTask.status !== 'completed' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, 'completed')}
                    >
                      Отметить выполненной
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Tasks;

