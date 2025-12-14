import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  AttachMoney as MoneyIcon,
  Assignment as TaskIcon
} from '@mui/icons-material';
import { analyticsAPI } from '../api/analytics';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    leads: 0,
    students: 0,
    revenue: 0,
    pending_tasks: 0,
    recent_conversions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboard();
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Дашборд
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PeopleIcon color="primary" sx={{ mr: 1, fontSize: 40 }} />
                  <Box>
                    <Typography color="textSecondary" variant="body2">
                      Всего лидов
                    </Typography>
                    <Typography variant="h4">
                      {stats.leads || 0}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/leads')}
                >
                  Перейти к лидам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SchoolIcon color="success" sx={{ mr: 1, fontSize: 40 }} />
                  <Box>
                    <Typography color="textSecondary" variant="body2">
                      Активных студентов
                    </Typography>
                    <Typography variant="h4">
                      {stats.students || 0}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/students')}
                >
                  Перейти к студентам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MoneyIcon color="warning" sx={{ mr: 1, fontSize: 40 }} />
                  <Box>
                    <Typography color="textSecondary" variant="body2">
                      Выручка (месяц)
                    </Typography>
                    <Typography variant="h4">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB'
                      }).format(stats.revenue || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/analytics')}
                >
                  Подробная аналитика
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TaskIcon color="error" sx={{ mr: 1, fontSize: 40 }} />
                  <Box>
                    <Typography color="textSecondary" variant="body2">
                      Активных задач
                    </Typography>
                    <Typography variant="h4">
                      {stats.pending_tasks || 0}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/tasks')}
                >
                  Перейти к задачам
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon color="info" sx={{ mr: 1, fontSize: 40 }} />
                  <Box>
                    <Typography color="textSecondary" variant="body2">
                      Конверсий (7 дней)
                    </Typography>
                    <Typography variant="h4">
                      {stats.recent_conversions || 0}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => navigate('/analytics')}
                >
                  Смотреть аналитику
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
  );
}

export default Dashboard;

