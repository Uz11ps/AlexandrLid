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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { Add as AddIcon, Download as DownloadIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { documentsAPI } from '../api/documents';

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newDocument, setNewDocument] = useState({
    document_type: 'contract',
    lead_id: '',
    template_id: ''
  });

  useEffect(() => {
    loadDocuments();
    loadTemplates();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getAll();
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await documentsAPI.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      contract: 'Договор',
      invoice: 'Счет',
      act: 'Акт',
      certificate: 'Сертификат',
      reference: 'Справка',
      other: 'Другое'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed': return 'success';
      case 'sent': return 'info';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Документы</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Создать документ
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Лид/Студент</TableCell>
                <TableCell>Файл</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Дата создания</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Документы не найдены
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} hover>
                    <TableCell>{doc.id}</TableCell>
                    <TableCell>{getDocumentTypeLabel(doc.document_type)}</TableCell>
                    <TableCell>{doc.lead_name || `ID: ${doc.lead_id}`}</TableCell>
                    <TableCell>{doc.file_name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={doc.status}
                        color={getStatusColor(doc.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString('ru-RU')}
                    </TableCell>
                    <TableCell>
                      {doc.file_path && (
                        <IconButton size="small" onClick={() => window.open(doc.file_path)}>
                          <DownloadIcon />
                        </IconButton>
                      )}
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog создания документа */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Создать документ</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Тип документа</InputLabel>
              <Select
                value={newDocument.document_type}
                onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value })}
              >
                <MenuItem value="contract">Договор</MenuItem>
                <MenuItem value="invoice">Счет</MenuItem>
                <MenuItem value="act">Акт</MenuItem>
                <MenuItem value="certificate">Сертификат</MenuItem>
                <MenuItem value="reference">Справка</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Шаблон</InputLabel>
              <Select
                value={newDocument.template_id}
                onChange={(e) => setNewDocument({ ...newDocument, template_id: e.target.value })}
              >
                <MenuItem value="">Без шаблона</MenuItem>
                {templates
                  .filter(t => t.document_type === newDocument.document_type)
                  .map(template => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="ID лида"
              type="number"
              value={newDocument.lead_id}
              onChange={(e) => setNewDocument({ ...newDocument, lead_id: e.target.value ? parseInt(e.target.value) : '' })}
              sx={{ mt: 2 }}
              helperText="Оставьте пустым, если документ не связан с лидом"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                try {
                  await documentsAPI.create(newDocument);
                  setCreateDialogOpen(false);
                  loadDocuments();
                } catch (error) {
                  console.error('Error creating document:', error);
                  alert('Ошибка при создании документа');
                }
              }}
              variant="contained"
            >
              Создать
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Documents;

