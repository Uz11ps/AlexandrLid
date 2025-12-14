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
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { studentsAPI } from '../api/students';

function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getById(id);
      setStudent(response.data);
      setEditData({
        progress_percent: response.data.progress_percent || 0,
        payment_status: response.data.payment_status || 'pending',
        materials_access: response.data.materials_access || false,
        group_id: response.data.group_id || '',
        curator_id: response.data.curator_id || ''
      });
    } catch (error) {
      console.error('Error loading student:', error);
      alert('Ошибка при загрузке студента');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await studentsAPI.update(id, editData);
      setEditDialogOpen(false);
      loadStudent();
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Ошибка при обновлении студента');
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'default';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!student) {
    return (
      <Container>
        <Typography>Студент не найден</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/students')}
        >
          Назад к студентам
        </Button>
        <Typography variant="h4">
          {student.fio || `Студент #${student.id}`}
        </Typography>
        <Chip
          label={student.payment_status || 'pending'}
          color={getPaymentStatusColor(student.payment_status)}
          sx={{ ml: 'auto' }}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Основная информация</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">ФИО:</Typography>
                <Typography variant="body1">{student.fio || '-'}</Typography>
              </Grid>
              {student.phone && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Телефон:</Typography>
                  <Typography variant="body1">{student.phone}</Typography>
                </Grid>
              )}
              {student.email && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email:</Typography>
                  <Typography variant="body1">{student.email}</Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Курс:</Typography>
                <Typography variant="body1">{student.course_name || '-'}</Typography>
              </Grid>
              {student.package_name && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Тариф:</Typography>
                  <Typography variant="body1">{student.package_name}</Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Сумма оплаты:</Typography>
                <Typography variant="body1">
                  {student.payment_amount
                    ? `${student.payment_amount} ${student.payment_currency || 'RUB'}`
                    : '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Прогресс:</Typography>
                <Typography variant="body1">{student.progress_percent || 0}%</Typography>
              </Grid>
              {student.start_date && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Дата начала:</Typography>
                  <Typography variant="body1">
                    {new Date(student.start_date).toLocaleDateString('ru-RU')}
                  </Typography>
                </Grid>
              )}
              {student.contract_number && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Номер договора:</Typography>
                  <Typography variant="body1">{student.contract_number}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {student.payments && student.payments.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Платежи</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Сумма</TableCell>
                      <TableCell>Способ оплаты</TableCell>
                      <TableCell>Тип</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {student.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          {payment.amount} {payment.currency || 'RUB'}
                        </TableCell>
                        <TableCell>{payment.payment_method || '-'}</TableCell>
                        <TableCell>{payment.payment_type || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {student.debts && student.debts.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Задолженности</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Сумма</TableCell>
                      <TableCell>Срок оплаты</TableCell>
                      <TableCell>Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {student.debts.map((debt) => (
                      <TableRow key={debt.id}>
                        <TableCell>
                          {debt.amount} {debt.currency || 'RUB'}
                        </TableCell>
                        <TableCell>
                          {new Date(debt.due_date).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={debt.status}
                            color={debt.status === 'paid' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
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
                Редактировать студента
              </Button>
              {student.lead_id && (
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/leads/${student.lead_id}`)}
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
        <DialogTitle>Редактировать студента</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Прогресс (%)"
            type="number"
            value={editData.progress_percent || 0}
            onChange={(e) => setEditData({ ...editData, progress_percent: parseInt(e.target.value) || 0 })}
            sx={{ mt: 2 }}
            inputProps={{ min: 0, max: 100 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Статус оплаты</InputLabel>
            <Select
              value={editData.payment_status || 'pending'}
              onChange={(e) => setEditData({ ...editData, payment_status: e.target.value })}
            >
              <MenuItem value="pending">Ожидает оплаты</MenuItem>
              <MenuItem value="partial">Частичная оплата</MenuItem>
              <MenuItem value="paid">Оплачено</MenuItem>
              <MenuItem value="overdue">Просрочено</MenuItem>
            </Select>
          </FormControl>
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

export default StudentDetail;

