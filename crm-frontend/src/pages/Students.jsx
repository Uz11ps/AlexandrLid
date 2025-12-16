import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Chip,
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { studentsAPI } from '../api/students';
import { leadsAPI } from '../api/leads';

function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [convertData, setConvertData] = useState({
    course_id: '',
    package_id: '',
    payment_amount: '',
    payment_method: '',
    contract_number: ''
  });

  useEffect(() => {
    loadStudents();
    loadLeads();
  }, [page, rowsPerPage]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.getAll({
        page: page + 1,
        limit: rowsPerPage
      });
      setStudents(response.data || []);
      setTotal(response.data?.length || 0);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await leadsAPI.getAll({ limit: 100 });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleConvert = async () => {
    try {
      const response = await studentsAPI.convertLead({
        lead_id: selectedLead.id,
        ...convertData
      });
      setConvertDialogOpen(false);
      
      // Перенаправляем на страницу созданного студента
      if (response.data && response.data.id) {
        navigate(`/students/${response.data.id}`);
      } else {
        // Если ID не получен, просто обновляем список
        loadStudents();
        alert('Студент успешно создан');
      }
    } catch (error) {
      console.error('Error converting lead:', error);
      alert('Ошибка при конвертации лида: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExportStudents = async () => {
    try {
      const response = await fetch('/api/students/export/excel', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting students:', error);
      alert('Ошибка при экспорте студентов');
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

  return (
    <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Студенты</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportStudents}
            >
              Экспорт в Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setConvertDialogOpen(true)}
            >
              Конвертировать лид в студента
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>Телефон</TableCell>
                <TableCell>Курс</TableCell>
                <TableCell>Сумма оплаты</TableCell>
                <TableCell>Статус оплаты</TableCell>
                <TableCell>Прогресс</TableCell>
                <TableCell>Дата начала</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Студенты не найдены
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.fio || '-'}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell>{student.course_name || '-'}</TableCell>
                    <TableCell>
                      {student.payment_amount
                        ? `${student.payment_amount} ${student.payment_currency || 'RUB'}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.payment_status || 'pending'}
                        color={getPaymentStatusColor(student.payment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{student.progress_percent || 0}%</TableCell>
                    <TableCell>
                      {student.start_date
                        ? new Date(student.start_date).toLocaleDateString('ru-RU')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />

        {/* Dialog для конвертации лида */}
        <Dialog open={convertDialogOpen} onClose={() => setConvertDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Конвертировать лид в студента</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Выберите лид</InputLabel>
              <Select
                value={selectedLead?.id || ''}
                onChange={(e) => {
                  const lead = leads.find(l => l.id === e.target.value);
                  setSelectedLead(lead);
                }}
              >
                {leads.filter(l => !l.is_student).map(lead => (
                  <MenuItem key={lead.id} value={lead.id}>
                    {lead.fio || lead.telegram_username || `ID: ${lead.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Сумма оплаты"
              type="number"
              value={convertData.payment_amount}
              onChange={(e) => setConvertData({ ...convertData, payment_amount: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Способ оплаты"
              value={convertData.payment_method}
              onChange={(e) => setConvertData({ ...convertData, payment_method: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Номер договора"
              value={convertData.contract_number}
              onChange={(e) => setConvertData({ ...convertData, contract_number: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConvertDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleConvert} variant="contained" disabled={!selectedLead}>
              Конвертировать
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Students;

