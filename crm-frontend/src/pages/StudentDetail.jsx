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
  TableRow,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { studentsAPI } from '../api/students';
import { tasksAPI } from '../api/tasks';

function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  
  // Диалоги
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  
  // Данные для форм
  const [editData, setEditData] = useState({});
  const [paymentData, setPaymentData] = useState({
    amount: '',
    currency: 'RUB',
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: 'full',
    notes: ''
  });
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    priority: 'normal',
    task_type: 'reminder'
  });

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await studentsAPI.getById(id);
      setStudent(response.data);
      setEditData({
        progress_percent: response.data.progress_percent || 0,
        payment_status: response.data.payment_status || 'pending',
        materials_access: response.data.materials_access || false,
        group_id: response.data.group_id || '',
        curator_id: response.data.curator_id || ''
      });
    } catch (err) {
      console.error('Error loading student:', err);
      if (err.response?.status === 404) {
        setError('Студент не найден');
      } else {
        setError('Ошибка при загрузке данных студента');
      }
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

  const handleAddPayment = async () => {
    try {
      await studentsAPI.addPayment(id, paymentData);
      setPaymentDialogOpen(false);
      setPaymentData({
        amount: '',
        currency: 'RUB',
        payment_method: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_type: 'full',
        notes: ''
      });
      loadStudent();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Ошибка при добавлении платежа');
    }
  };

  const handleCreateTask = async () => {
    if (!taskData.title || !taskData.due_date) {
      alert('Заполните обязательные поля');
      return;
    }

    try {
      const dueDateTime = taskData.due_time 
        ? `${taskData.due_date}T${taskData.due_time}:00`
        : `${taskData.due_date}T12:00:00`;

      await tasksAPI.create({
        ...taskData,
        lead_id: student.lead_id,
        due_date: dueDateTime
      });
      
      setTaskDialogOpen(false);
      setTaskData({
        title: '',
        description: '',
        due_date: '',
        due_time: '',
        priority: 'normal',
        task_type: 'reminder'
      });
      loadStudent();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Ошибка при создании задачи');
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

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'new': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'default';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container>
        <LinearProgress />
      </Container>
    );
  }

  if (error || !student) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error || 'Студент не найден'}</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/students')}
            sx={{ mt: 2 }}
          >
            Назад к студентам
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
        {/* Основная информация */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Основная информация</Typography>
              <IconButton onClick={() => setEditDialogOpen(true)} size="small">
                <EditIcon />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">ФИО:</Typography>
                <Typography variant="body1">{student.fio || '-'}</Typography>
              </Grid>
              {student.phone && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Телефон:</Typography>
                  <Typography variant="body1">{student.phone}</Typography>
                </Grid>
              )}
              {student.email && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email:</Typography>
                  <Typography variant="body1">{student.email}</Typography>
                </Grid>
              )}
              {student.telegram_username && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Telegram:</Typography>
                  <Typography variant="body1">@{student.telegram_username}</Typography>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Курс:</Typography>
                <Typography variant="body1">{student.course_name || '-'}</Typography>
              </Grid>
              {student.package_name && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Тариф:</Typography>
                  <Typography variant="body1">{student.package_name}</Typography>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Сумма оплаты:</Typography>
                <Typography variant="body1">
                  {student.payment_amount
                    ? `${student.payment_amount} ${student.payment_currency || 'RUB'}`
                    : '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Прогресс:</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{student.progress_percent || 0}%</Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={student.progress_percent || 0} 
                    sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Grid>
              {student.start_date && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Дата начала:</Typography>
                  <Typography variant="body1">
                    {new Date(student.start_date).toLocaleDateString('ru-RU')}
                  </Typography>
                </Grid>
              )}
              {student.contract_number && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Номер договора:</Typography>
                  <Typography variant="body1">{student.contract_number}</Typography>
                </Grid>
              )}
              {student.group_name && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Группа:</Typography>
                  <Typography variant="body1">{student.group_name}</Typography>
                </Grid>
              )}
              {student.curator_name && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Куратор:</Typography>
                  <Typography variant="body1">{student.curator_name}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Вкладки с детальной информацией */}
          <Paper sx={{ p: 2 }}>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab icon={<PaymentIcon />} iconPosition="start" label="Платежи" />
              <Tab icon={<AssignmentIcon />} iconPosition="start" label="Задачи" />
              <Tab icon={<HistoryIcon />} iconPosition="start" label="Взаимодействия" />
              <Tab icon={<CommentIcon />} iconPosition="start" label="Комментарии" />
              <Tab icon={<DescriptionIcon />} iconPosition="start" label="Документы" />
            </Tabs>

            {/* Платежи */}
            {tab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Платежи</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    size="small"
                    onClick={() => setPaymentDialogOpen(true)}
                  >
                    Добавить платеж
                  </Button>
                </Box>
                {student.payments && student.payments.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Дата</TableCell>
                          <TableCell>Сумма</TableCell>
                          <TableCell>Способ оплаты</TableCell>
                          <TableCell>Тип</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell>Создал</TableCell>
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
                            <TableCell>
                              <Chip
                                label={payment.status}
                                color={payment.status === 'completed' ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{payment.created_by_name || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Платежей пока нет
                  </Typography>
                )}
              </Box>
            )}

            {/* Задачи */}
            {tab === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Задачи</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    size="small"
                    onClick={() => setTaskDialogOpen(true)}
                  >
                    Создать задачу
                  </Button>
                </Box>
                {student.tasks && student.tasks.length > 0 ? (
                  <List>
                    {student.tasks.map((task) => (
                      <React.Fragment key={task.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">{task.title}</Typography>
                                <Chip
                                  label={task.status}
                                  color={getTaskStatusColor(task.status)}
                                  size="small"
                                />
                                <Chip
                                  label={task.priority}
                                  color={getPriorityColor(task.priority)}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  {task.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Срок: {new Date(task.due_date).toLocaleString('ru-RU')} | 
                                  Менеджер: {task.manager_name || '-'}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Задач пока нет
                  </Typography>
                )}
              </Box>
            )}

            {/* Взаимодействия */}
            {tab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>История взаимодействий</Typography>
                {student.interactions && student.interactions.length > 0 ? (
                  <List>
                    {student.interactions.map((interaction) => (
                      <React.Fragment key={interaction.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">
                                  {interaction.interaction_type}
                                </Typography>
                                <Chip label={interaction.manager_name || 'Система'} size="small" />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  {interaction.notes || 'Без описания'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(interaction.created_at).toLocaleString('ru-RU')}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Взаимодействий пока нет
                  </Typography>
                )}
              </Box>
            )}

            {/* Комментарии */}
            {tab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>Комментарии</Typography>
                {student.comments && student.comments.length > 0 ? (
                  <List>
                    {student.comments.map((comment) => (
                      <React.Fragment key={comment.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">
                                  {comment.manager_name || 'Система'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(comment.created_at).toLocaleString('ru-RU')}
                                </Typography>
                              </Box>
                            }
                            secondary={comment.comment_text}
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Комментариев пока нет
                  </Typography>
                )}
              </Box>
            )}

            {/* Документы */}
            {tab === 4 && (
              <Box>
                <Typography variant="h6" gutterBottom>Документы</Typography>
                {student.documents && student.documents.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Тип</TableCell>
                          <TableCell>Название</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell>Дата создания</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {student.documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>{doc.document_type}</TableCell>
                            <TableCell>{doc.file_name || '-'}</TableCell>
                            <TableCell>
                              <Chip label={doc.status} size="small" />
                            </TableCell>
                            <TableCell>
                              {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Документов пока нет
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Боковая панель с действиями */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Действия</Typography>
              <Button
                fullWidth
                variant="contained"
                startIcon={<EditIcon />}
                sx={{ mt: 1 }}
                onClick={() => setEditDialogOpen(true)}
              >
                Редактировать студента
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PaymentIcon />}
                sx={{ mt: 1 }}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Добавить платеж
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AssignmentIcon />}
                sx={{ mt: 1 }}
                onClick={() => setTaskDialogOpen(true)}
              >
                Создать задачу
              </Button>
              {student.lead_id && (
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => navigate(`/leads/${student.lead_id}`)}
                >
                  Перейти к лиду
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Задолженности */}
          {student.debts && student.debts.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Задолженности</Typography>
                <List>
                  {student.debts.map((debt) => (
                    <ListItem key={debt.id}>
                      <ListItemText
                        primary={`${debt.amount} ${debt.currency || 'RUB'}`}
                        secondary={`Срок: ${new Date(debt.due_date).toLocaleDateString('ru-RU')}`}
                      />
                      <Chip
                        label={debt.status}
                        color={debt.status === 'paid' ? 'success' : 'error'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Диалог редактирования */}
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
          <Button onClick={handleUpdate} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления платежа */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить платеж</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Сумма"
            type="number"
            value={paymentData.amount}
            onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Валюта</InputLabel>
            <Select
              value={paymentData.currency}
              onChange={(e) => setPaymentData({ ...paymentData, currency: e.target.value })}
            >
              <MenuItem value="RUB">RUB</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Способ оплаты"
            value={paymentData.payment_method}
            onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Дата платежа"
            type="date"
            value={paymentData.payment_date}
            onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Тип платежа</InputLabel>
            <Select
              value={paymentData.payment_type}
              onChange={(e) => setPaymentData({ ...paymentData, payment_type: e.target.value })}
            >
              <MenuItem value="full">Полная оплата</MenuItem>
              <MenuItem value="partial">Частичная оплата</MenuItem>
              <MenuItem value="installment">Рассрочка</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Примечания"
            multiline
            rows={3}
            value={paymentData.notes}
            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddPayment} variant="contained">Добавить</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания задачи */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать задачу</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название задачи"
            value={taskData.title}
            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
            sx={{ mt: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Описание"
            multiline
            rows={3}
            value={taskData.description}
            onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Срок выполнения"
            type="date"
            value={taskData.due_date}
            onChange={(e) => setTaskData({ ...taskData, due_date: e.target.value })}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            fullWidth
            label="Время"
            type="time"
            value={taskData.due_time}
            onChange={(e) => setTaskData({ ...taskData, due_time: e.target.value })}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={taskData.priority}
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
          <Button onClick={handleCreateTask} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default StudentDetail;
