import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid
} from '@mui/material';
import { tasksAPI } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

function Tasks() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [tasks, setTasks] = useState({
    today: [],
    tomorrow: [],
    upcoming: []
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Задачи и напоминания
          </Typography>
          <Button color="inherit" onClick={() => navigate('/')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={() => navigate('/leads')}>
            Лиды
          </Button>
          <Button color="inherit" onClick={logout}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
      </Container>
    </Box>
  );
}

export default Tasks;

