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

function Tasks() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [tasks, setTasks] = useState({
    today: [],
    tomorrow: [],
    upcoming: []
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'reminder',
    due_date: '',
    due_time: '',
    priority: 'normal',
    lead_id: ''
  });

  useEffect(() => {
    loadTasks();
  }, [tab]);

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
            onClick={() => task.lead_id && navigate(`/leads/${task.lead_id}`)}
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
                label={task.status}
                color={getStatusColor(task.status)}
                size="small"
              />
              <Chip
                label={task.priority}
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
      await tasksAPI.create(newTask);
      setCreateDialogOpen(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'reminder',
        due_date: '',
        due_time: '',
        priority: 'normal',
        lead_id: ''
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Ошибка при создании задачи');
    }
  };

  return (
    <Container maxWidth="lg">
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateTask} variant="contained">
              Создать
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Tasks;

