import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Card,
  CardContent
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { leadsAPI } from '../api/leads';
import { tasksAPI } from '../api/tasks';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLeads: 0,
    todayTasks: 0,
    newLeads: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [leadsRes, tasksRes] = await Promise.all([
        leadsAPI.getAll({ limit: 1 }),
        tasksAPI.getAll({ date_filter: 'today', status: 'new' })
      ]);

      setStats({
        totalLeads: leadsRes.data.pagination?.total || 0,
        todayTasks: tasksRes.data.tasks?.length || 0,
        newLeads: leadsRes.data.leads?.filter(l => l.status === 'Новый лид').length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            CRM Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name} ({user?.email})
          </Typography>
          <Button color="inherit" onClick={logout}>
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Панель управления
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Всего лидов
                </Typography>
                <Typography variant="h4">
                  {stats.totalLeads}
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/leads')}
                  sx={{ mt: 1 }}
                >
                  Перейти к лидам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Задачи на сегодня
                </Typography>
                <Typography variant="h4">
                  {stats.todayTasks}
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/tasks')}
                  sx={{ mt: 1 }}
                >
                  Перейти к задачам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Новые лиды
                </Typography>
                <Typography variant="h4">
                  {stats.newLeads}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Dashboard;

