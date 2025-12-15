import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { leadsAPI } from '../api/leads';
import { funnelAPI } from '../api/funnel';

const FUNNEL_STAGES = [
  'Новый лид',
  'Первичный контакт',
  'Квалификация',
  'Презентация курса',
  'Работа с возражениями',
  'Отправка оффера',
  'Ожидание оплаты',
  'Конвертирован в студента',
  'Отказ'
];

function LeadsList() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [funnelStages, setFunnelStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [funnelFilter, setFunnelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'funnel'
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    fio: '',
    phone: '',
    email: '',
    telegram_username: '',
    source: 'Manual',
    notes: ''
  });

  useEffect(() => {
    loadFunnelStages();
    loadLeads();
  }, [page, rowsPerPage, funnelFilter, search]);

  const loadFunnelStages = async () => {
    try {
      const response = await funnelAPI.getStages();
      setFunnelStages(response.data || []);
    } catch (error) {
      console.error('Error loading funnel stages:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(funnelFilter && { funnel_stage: funnelFilter }),
        ...(search && { search })
      };

      const response = await leadsAPI.getAll(params);
      const leadsData = response.data.leads || [];
      setLeads(leadsData);
      setTotal(response.data.pagination?.total || 0);
      
      // Группировка по этапам для воронки
      const grouped = {};
      leadsData.forEach(lead => {
        const stage = lead.funnel_stage || 'Новый лид';
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push(lead);
      });
      setLeadsByStage(grouped);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      await funnelAPI.updateLeadStage(leadId, newStage);
      loadLeads();
    } catch (error) {
      console.error('Error updating lead stage:', error);
      alert('Ошибка при изменении этапа');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'горячий': return 'error';
      case 'теплый': return 'warning';
      default: return 'default';
    }
  };

  const handleCreateLead = async () => {
    try {
      await leadsAPI.create(newLead);
      setCreateDialogOpen(false);
      setNewLead({
        fio: '',
        phone: '',
        email: '',
        telegram_username: '',
        source: 'Manual',
        notes: ''
      });
      loadLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Ошибка при создании лида');
    }
  };

  const handleDeleteLead = async (leadId, e) => {
    e.stopPropagation();
    if (!window.confirm('Вы уверены, что хотите удалить этого лида?')) return;
    try {
      await leadsAPI.delete(leadId);
      loadLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Ошибка при удалении лида');
    }
  };

  const handleExportLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (funnelFilter) params.append('funnel_stage', funnelFilter);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/leads/export/excel?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting leads:', error);
      alert('Ошибка при экспорте лидов');
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const leadId = parseInt(draggableId);
    const newStage = destination.droppableId;
    
    if (newStage) {
      await handleStageChange(leadId, newStage);
    }
  };

  return (
    <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Лиды</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportLeads}
            >
              Экспорт в Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Создать лид
            </Button>
            <Button
              variant={viewMode === 'table' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('table')}
            >
              Таблица
            </Button>
            <Button
              variant={viewMode === 'funnel' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('funnel')}
            >
              Воронка
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            label="Поиск"
            variant="outlined"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Этап воронки</InputLabel>
            <Select
              value={funnelFilter}
              label="Этап воронки"
              onChange={(e) => setFunnelFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              {funnelStages.map(stage => (
                <MenuItem key={stage.id} value={stage.name}>{stage.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {viewMode === 'funnel' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
              {funnelStages.map(stage => (
                <Droppable key={stage.id} droppableId={stage.name}>
                  {(provided, snapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minWidth: 300,
                        maxWidth: 300,
                        p: 2,
                        bgcolor: snapshot.isDraggingOver ? 'action.selected' : 'grey.50',
                        borderRadius: 2,
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                        {stage.name} ({leadsByStage[stage.name]?.length || 0})
                      </Typography>
                      <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
                        {(leadsByStage[stage.name] || []).map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  mb: 1,
                                  cursor: 'grab',
                                  bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                                  boxShadow: snapshot.isDragging ? 4 : 1,
                                  '&:hover': { bgcolor: 'action.hover', boxShadow: 2 },
                                  '&:active': { cursor: 'grabbing' }
                                }}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                              >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, position: 'relative' }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {lead.fio || lead.telegram_username || `ID: ${lead.id}`}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {lead.phone || lead.email || '-'}
                                  </Typography>
                                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <Chip
                                      label={lead.priority}
                                      color={getPriorityColor(lead.priority)}
                                      size="small"
                                    />
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLead(lead.id, e);
                                      }}
                                      sx={{ ml: 'auto' }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {(!leadsByStage[stage.name] || leadsByStage[stage.name].length === 0) && (
                          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                            Перетащите лида сюда
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  )}
                </Droppable>
              ))}
            </Box>
          </DragDropContext>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>ФИО</TableCell>
                    <TableCell>Телефон</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Telegram</TableCell>
                    <TableCell>Этап</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Приоритет</TableCell>
                    <TableCell>Дата создания</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      hover
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{lead.id}</TableCell>
                      <TableCell>{lead.fio || '-'}</TableCell>
                      <TableCell>{lead.phone || '-'}</TableCell>
                      <TableCell>{lead.email || '-'}</TableCell>
                      <TableCell>@{lead.telegram_username || '-'}</TableCell>
                      <TableCell>{lead.funnel_stage}</TableCell>
                      <TableCell>{lead.status}</TableCell>
                      <TableCell>
                        <Chip
                          label={lead.priority}
                          color={getPriorityColor(lead.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
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
          </>
        )}

        {/* Create Lead Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Создать новый лид</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="ФИО"
              value={newLead.fio}
              onChange={(e) => setNewLead({ ...newLead, fio: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Телефон"
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newLead.email}
              onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Telegram Username"
              value={newLead.telegram_username}
              onChange={(e) => setNewLead({ ...newLead, telegram_username: e.target.value })}
              sx={{ mt: 2 }}
              placeholder="без @"
            />
            <TextField
              fullWidth
              label="Источник"
              value={newLead.source}
              onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Заметки"
              multiline
              rows={3}
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateLead} variant="contained">
              Создать
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default LeadsList;

