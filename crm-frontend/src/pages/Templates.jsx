import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { templatesAPI } from '../api/templates';

function Templates() {
  const [tab, setTab] = useState(0);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [objections, setObjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'sales',
    template_text: '',
    objection_type: '',
    response_text: ''
  });

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 0) {
        const response = await templatesAPI.getMessages();
        setMessageTemplates(response.data || []);
      } else {
        const response = await templatesAPI.getObjections();
        setObjections(response.data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'sales',
      template_text: '',
      objection_type: '',
      response_text: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (tab === 0) {
      setFormData({
        name: item.name || '',
        category: item.category || 'sales',
        template_text: item.template_text || ''
      });
    } else {
      setFormData({
        objection_type: item.objection_type || '',
        response_text: item.response_text || ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (tab === 0) {
        if (editingItem) {
          await templatesAPI.updateMessage(editingItem.id, formData);
        } else {
          await templatesAPI.createMessage(formData);
        }
      } else {
        await templatesAPI.createObjection(formData);
      }
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Ошибка при сохранении');
    }
  };

  return (
    <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Шаблоны сообщений</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Создать
          </Button>
        </Box>

        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Шаблоны сообщений" />
          <Tab label="Ответы на возражения" />
        </Tabs>

        {tab === 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Категория</TableCell>
                  <TableCell>Текст</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messageTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.id}</TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>
                      <Chip label={template.category} size="small" />
                    </TableCell>
                    <TableCell>{template.template_text?.substring(0, 50)}...</TableCell>
                    <TableCell>
                      <Chip
                        label={template.is_active ? 'Активен' : 'Неактивен'}
                        color={template.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(template)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Тип возражения</TableCell>
                  <TableCell>Ответ</TableCell>
                  <TableCell>Эффективность</TableCell>
                  <TableCell>Использований</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {objections.map((objection) => (
                  <TableRow key={objection.id}>
                    <TableCell>{objection.id}</TableCell>
                    <TableCell>{objection.objection_type}</TableCell>
                    <TableCell>{objection.response_text?.substring(0, 50)}...</TableCell>
                    <TableCell>
                      {objection.effectiveness_rating
                        ? '⭐'.repeat(objection.effectiveness_rating)
                        : '-'}
                    </TableCell>
                    <TableCell>{objection.usage_count || 0}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(objection)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog создания/редактирования */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingItem ? 'Редактировать' : 'Создать'} {tab === 0 ? 'шаблон' : 'ответ на возражение'}
          </DialogTitle>
          <DialogContent>
            {tab === 0 ? (
              <>
                <TextField
                  fullWidth
                  label="Название"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  sx={{ mt: 2 }}
                />
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Категория</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <MenuItem value="sales">Продажи</MenuItem>
                    <MenuItem value="education">Обучение</MenuItem>
                    <MenuItem value="support">Поддержка</MenuItem>
                    <MenuItem value="objections">Возражения</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Текст шаблона"
                  multiline
                  rows={6}
                  value={formData.template_text}
                  onChange={(e) => setFormData({ ...formData, template_text: e.target.value })}
                  sx={{ mt: 2 }}
                  placeholder="Используйте переменные: {name}, {course}, {price} и т.д."
                />
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Тип возражения"
                  value={formData.objection_type}
                  onChange={(e) => setFormData({ ...formData, objection_type: e.target.value })}
                  sx={{ mt: 2 }}
                  placeholder="Например: Дорого, Нет времени, Не уверен"
                />
                <TextField
                  fullWidth
                  label="Ответ на возражение"
                  multiline
                  rows={6}
                  value={formData.response_text}
                  onChange={(e) => setFormData({ ...formData, response_text: e.target.value })}
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} variant="contained">
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Templates;

