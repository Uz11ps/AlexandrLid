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
  Chip,
  Grid
} from '@mui/material';
import { Add as AddIcon, Download as DownloadIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { documentsAPI } from '../api/documents';
import { leadsAPI } from '../api/leads';
import { useNavigate } from 'react-router-dom';

function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [newDocument, setNewDocument] = useState({
    document_type: 'contract',
    lead_id: '',
    template_id: ''
  });

  useEffect(() => {
    loadDocuments();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (createDialogOpen) {
      loadLeads();
    }
  }, [createDialogOpen]);

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

  const loadLeads = async () => {
    try {
      const response = await leadsAPI.getAll({ limit: 100 });
      setLeads(response.data.leads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setViewDialogOpen(true);
  };

  const handleDownload = async (document) => {
    try {
      if (document.file_path) {
        // Если есть прямой путь к файлу, открываем его
        window.open(document.file_path, '_blank');
      } else {
        // Пытаемся скачать через API
        try {
          const response = await documentsAPI.download(document.id);
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', document.file_name || `document_${document.id}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          // Если API не работает, пробуем прямой путь
          window.open(`/api/documents/${document.id}/download`, '_blank');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Ошибка при скачивании документа');
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
                      {doc.file_name && (
                        <IconButton 
                          size="small" 
                          onClick={() => handleDownload(doc)}
                          title="Скачать файл"
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small"
                        onClick={() => handleViewDocument(doc)}
                        title="Просмотреть детали"
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
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Лид</InputLabel>
              <Select
                value={newDocument.lead_id || ''}
                onChange={(e) => setNewDocument({ ...newDocument, lead_id: e.target.value || '' })}
                label="Лид"
              >
                <MenuItem value="">Не выбран</MenuItem>
                {leads.map(lead => (
                  <MenuItem key={lead.id} value={lead.id}>
                    {lead.fio || lead.telegram_username || `ID: ${lead.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                try {
                  const documentData = {
                    ...newDocument,
                    lead_id: newDocument.lead_id || undefined
                  };
                  await documentsAPI.create(documentData);
                  setCreateDialogOpen(false);
                  setNewDocument({
                    document_type: 'contract',
                    lead_id: '',
                    template_id: ''
                  });
                  loadDocuments();
                } catch (error) {
                  console.error('Error creating document:', error);
                  alert('Ошибка при создании документа: ' + (error.response?.data?.error || error.message));
                }
              }}
              variant="contained"
            >
              Создать
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog просмотра документа */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Детали документа</Typography>
              {selectedDocument && (
                <Chip
                  label={selectedDocument.status || 'draft'}
                  color={getStatusColor(selectedDocument.status)}
                  size="small"
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedDocument && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">ID:</Typography>
                    <Typography variant="body1">{selectedDocument.id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Тип документа:</Typography>
                    <Typography variant="body1">
                      {getDocumentTypeLabel(selectedDocument.document_type)}
                    </Typography>
                  </Grid>
                  {selectedDocument.lead_name && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Лид:</Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
                        onClick={() => {
                          setViewDialogOpen(false);
                          navigate(`/leads/${selectedDocument.lead_id}`);
                        }}
                      >
                        {selectedDocument.lead_name}
                      </Typography>
                    </Grid>
                  )}
                  {selectedDocument.file_name && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Имя файла:</Typography>
                      <Typography variant="body1">{selectedDocument.file_name}</Typography>
                    </Grid>
                  )}
                  {selectedDocument.file_path && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Путь к файлу:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {selectedDocument.file_path}
                      </Typography>
                    </Grid>
                  )}
                  {selectedDocument.file_size && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Размер файла:</Typography>
                      <Typography variant="body1">
                        {(selectedDocument.file_size / 1024).toFixed(2)} KB
                      </Typography>
                    </Grid>
                  )}
                  {selectedDocument.mime_type && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Тип файла:</Typography>
                      <Typography variant="body1">{selectedDocument.mime_type}</Typography>
                    </Grid>
                  )}
                  {selectedDocument.created_by_name && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Создал:</Typography>
                      <Typography variant="body1">{selectedDocument.created_by_name}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Дата создания:</Typography>
                    <Typography variant="body1">
                      {new Date(selectedDocument.created_at).toLocaleString('ru-RU')}
                    </Typography>
                  </Grid>
                  {selectedDocument.signed_at && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Дата подписания:</Typography>
                      <Typography variant="body1">
                        {new Date(selectedDocument.signed_at).toLocaleString('ru-RU')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedDocument && selectedDocument.file_name && (
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(selectedDocument)}
                variant="contained"
              >
                Скачать PDF
              </Button>
            )}
            <Button onClick={() => setViewDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Documents;

