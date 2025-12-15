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
  const [error, setError] = useState(null);
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
      setError(null);
      const response = await productsAPI.getCourse(id);
      if (response.data) {
        setCourse(response.data);
        setTariffs(response.data.tariffs || []);
      } else {
        setError('Данные курса пусты');
        console.error('Course data is empty');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      if (error.response?.status === 404) {
        setError('Курс с ID ' + id + ' не найден в базе данных');
      } else if (error.response?.status === 500) {
        setError('Ошибка сервера при загрузке курса');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Не удалось загрузить курс. Проверьте подключение к интернету.');
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
      const response = await productsAPI.deleteTariff(tariffId);
      console.log('Tariff deleted:', response.data);
      // Перезагружаем курс для обновления списка тарифов
      await loadCourse();
    } catch (error) {
      console.error('Error deleting tariff:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ошибка при удалении тарифа';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <LinearProgress />
          <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
            Загрузка курса...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!course || error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/products')}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">Детали курса</Typography>
          </Box>
          
          <Paper sx={{ p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Курс не найден
              </Typography>
              <Typography variant="body2">
                {error || `Курс с ID ${id} не найден в системе.`}
              </Typography>
            </Alert>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/products')}
              >
                Вернуться к списку курсов
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/products')}
              >
                Создать новый курс
              </Button>
            </Box>
          </Paper>
        </Box>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Описание курса
              </Typography>
              <Chip
                label={course.status === 'active' ? 'Активен' : course.status === 'draft' ? 'Черновик' : course.status}
                color={course.status === 'active' ? 'success' : 'default'}
                size="small"
              />
            </Box>
            
            <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
              {course.description || 'Описание не указано'}
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {course.format && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Формат:</Typography>
                  <Typography variant="body1">{course.format}</Typography>
                </Grid>
              )}
              {course.duration_weeks && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Длительность:</Typography>
                  <Typography variant="body1">{course.duration_weeks} {course.duration_weeks === 1 ? 'неделя' : course.duration_weeks < 5 ? 'недели' : 'недель'}</Typography>
                </Grid>
              )}
              {course.author && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Автор:</Typography>
                  <Typography variant="body1">{course.author}</Typography>
                </Grid>
              )}
              {course.created_at && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Создан:</Typography>
                  <Typography variant="body1">
                    {new Date(course.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {course.cover_image && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Обложка курса
              </Typography>
              <Box
                component="img"
                src={course.cover_image}
                alt={course.name}
                sx={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 1,
                  maxHeight: 300,
                  objectFit: 'cover'
                }}
              />
            </Paper>
          </Grid>
        )}

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

