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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { productsAPI } from '../api/products';

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tariffDialogOpen, setTariffDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [tariffFormData, setTariffFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'RUB',
    features: [],
    installment_available: false,
    order_index: 0
  });

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getCourse(id);
      if (response.data) {
        setCourse(response.data);
        setTariffs(response.data.tariffs || []);
      } else {
        console.error('Course data is empty');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      if (error.response?.status === 404) {
        // Курс не найден - это нормально, показываем сообщение
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTariff = () => {
    setEditingTariff(null);
    setTariffFormData({
      name: '',
      description: '',
      price: '',
      currency: 'RUB',
      features: [],
      installment_available: false,
      order_index: tariffs.length
    });
    setTariffDialogOpen(true);
  };

  const handleEditTariff = (tariff) => {
    setEditingTariff(tariff);
    setTariffFormData({
      name: tariff.name || '',
      description: tariff.description || '',
      price: tariff.price || '',
      currency: tariff.currency || 'RUB',
      features: tariff.features || [],
      installment_available: tariff.installment_available || false,
      order_index: tariff.order_index || 0
    });
    setTariffDialogOpen(true);
  };

  const handleSaveTariff = async () => {
    try {
      if (editingTariff) {
        await productsAPI.updateTariff(editingTariff.id, tariffFormData);
      } else {
        await productsAPI.createTariff(id, tariffFormData);
      }
      setTariffDialogOpen(false);
      loadCourse();
    } catch (error) {
      console.error('Error saving tariff:', error);
      alert('Ошибка при сохранении тарифа');
    }
  };

  const handleDeleteTariff = async (tariffId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот тариф?')) return;
    try {
      await productsAPI.deleteTariff(tariffId);
      loadCourse();
    } catch (error) {
      console.error('Error deleting tariff:', error);
      alert('Ошибка при удалении тарифа');
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!course) {
    return (
      <Container>
        <Alert severity="error">Курс не найден</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/products')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">{course.name}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Описание курса
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {course.description || 'Описание не указано'}
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Формат:</Typography>
                <Typography variant="body1">{course.format || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Длительность:</Typography>
                <Typography variant="body1">{course.duration_weeks ? `${course.duration_weeks} недель` : '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Статус:</Typography>
                <Chip
                  label={course.status}
                  color={course.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Тарифы</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTariff}
              >
                Добавить тариф
              </Button>
            </Box>

            {tariffs.length === 0 ? (
              <Alert severity="info">Тарифы не добавлены. Добавьте первый тариф для курса.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Название</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Цена</TableCell>
                      <TableCell>Рассрочка</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tariffs.map((tariff) => (
                      <TableRow key={tariff.id}>
                        <TableCell>{tariff.name}</TableCell>
                        <TableCell>{tariff.description?.substring(0, 50) || '-'}...</TableCell>
                        <TableCell>{tariff.price} {tariff.currency}</TableCell>
                        <TableCell>
                          <Chip
                            label={tariff.installment_available ? 'Да' : 'Нет'}
                            color={tariff.installment_available ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleEditTariff(tariff)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteTariff(tariff.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Tariff Dialog */}
      <Dialog open={tariffDialogOpen} onClose={() => setTariffDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTariff ? 'Редактировать тариф' : 'Создать тариф'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название тарифа"
            value={tariffFormData.name}
            onChange={(e) => setTariffFormData({ ...tariffFormData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Описание"
            multiline
            rows={3}
            value={tariffFormData.description}
            onChange={(e) => setTariffFormData({ ...tariffFormData, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Цена"
            type="number"
            value={tariffFormData.price}
            onChange={(e) => setTariffFormData({ ...tariffFormData, price: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Валюта"
            value={tariffFormData.currency}
            onChange={(e) => setTariffFormData({ ...tariffFormData, currency: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Box sx={{ mt: 2 }}>
            <Chip
              label={tariffFormData.installment_available ? 'Рассрочка доступна' : 'Рассрочка недоступна'}
              color={tariffFormData.installment_available ? 'success' : 'default'}
              onClick={() => setTariffFormData({ ...tariffFormData, installment_available: !tariffFormData.installment_available })}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTariffDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveTariff} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default CourseDetail;

