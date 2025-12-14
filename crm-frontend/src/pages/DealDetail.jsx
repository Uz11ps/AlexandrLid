import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { dealsAPI } from '../api/deals';

function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadDeal();
  }, [id]);

  const loadDeal = async () => {
    try {
      setLoading(true);
      const response = await dealsAPI.getById(id);
      setDeal(response.data);
      setEditData({
        stage: response.data.stage,
        probability_percent: response.data.probability_percent || 0,
        amount: response.data.amount || '',
        currency: response.data.currency || 'RUB',
        expected_close_date: response.data.expected_close_date ? response.data.expected_close_date.split('T')[0] : '',
        payment_method: response.data.payment_method || ''
      });
    } catch (error) {
      console.error('Error loading deal:', error);
      alert('Ошибка при загрузке сделки');
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await dealsAPI.update(id, editData);
      setEditDialogOpen(false);
      loadDeal();
    } catch (error) {
      console.error('Error updating deal:', error);
      alert('Ошибка при обновлении сделки');
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'closed': return 'success';
      case 'lost': return 'error';
      case 'draft': return 'default';
      default: return 'primary';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!deal) {
    return (
      <Container>
        <Typography>Сделка не найдена</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/deals')}
        >
          Назад к сделкам
        </Button>
        <Typography variant="h4">Сделка #{deal.id}</Typography>
        <Chip
          label={deal.stage || 'draft'}
          color={getStageColor(deal.stage)}
          sx={{ ml: 'auto' }}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Основная информация</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Лид:</Typography>
                <Typography variant="body1">
                  {deal.lead_name || deal.fio || `ID: ${deal.lead_id}`}
                </Typography>
              </Grid>
              {deal.lead_phone && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Телефон:</Typography>
                  <Typography variant="body1">{deal.lead_phone}</Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Тип продукта:</Typography>
                <Typography variant="body1">{deal.product_type || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Менеджер:</Typography>
                <Typography variant="body1">{deal.manager_name || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Сумма:</Typography>
                <Typography variant="body1">
                  {deal.amount ? `${deal.amount} ${deal.currency || 'RUB'}` : '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Вероятность:</Typography>
                <Typography variant="body1">{deal.probability_percent || 0}%</Typography>
              </Grid>
              {deal.expected_close_date && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Ожидаемая дата закрытия:</Typography>
                  <Typography variant="body1">
                    {new Date(deal.expected_close_date).toLocaleDateString('ru-RU')}
                  </Typography>
                </Grid>
              )}
              {deal.actual_close_date && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Дата закрытия:</Typography>
                  <Typography variant="body1">
                    {new Date(deal.actual_close_date).toLocaleDateString('ru-RU')}
                  </Typography>
                </Grid>
              )}
              {deal.payment_method && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Способ оплаты:</Typography>
                  <Typography variant="body1">{deal.payment_method}</Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Дата создания:</Typography>
                <Typography variant="body1">
                  {new Date(deal.created_at).toLocaleString('ru-RU')}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Действия</Typography>
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => setEditDialogOpen(true)}
              >
                Редактировать сделку
              </Button>
              {deal.lead_id && (
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/leads/${deal.lead_id}`)}
                >
                  Перейти к лиду
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog редактирования */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать сделку</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Этап</InputLabel>
            <Select
              value={editData.stage || 'draft'}
              onChange={(e) => setEditData({ ...editData, stage: e.target.value })}
            >
              <MenuItem value="draft">Черновик</MenuItem>
              <MenuItem value="negotiation">Переговоры</MenuItem>
              <MenuItem value="proposal">Предложение</MenuItem>
              <MenuItem value="agreement">Согласование</MenuItem>
              <MenuItem value="closed">Закрыта</MenuItem>
              <MenuItem value="lost">Проиграна</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Сумма"
            type="number"
            value={editData.amount || ''}
            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Валюта</InputLabel>
            <Select
              value={editData.currency || 'RUB'}
              onChange={(e) => setEditData({ ...editData, currency: e.target.value })}
            >
              <MenuItem value="RUB">RUB</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Вероятность (%)"
            type="number"
            value={editData.probability_percent || 0}
            onChange={(e) => setEditData({ ...editData, probability_percent: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Ожидаемая дата закрытия"
            type="date"
            value={editData.expected_close_date || ''}
            onChange={(e) => setEditData({ ...editData, expected_close_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Способ оплаты"
            value={editData.payment_method || ''}
            onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleUpdate} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default DealDetail;

