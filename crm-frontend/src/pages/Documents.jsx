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
import { Add as AddIcon, Download as DownloadIcon, Visibility as ViewIcon, CloudUpload as UploadIcon, Delete as DeleteIcon } from '@mui/icons-material';
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
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

  const handleViewDocument = async (document) => {
    try {
      // Загружаем полную информацию о документе
      const response = await documentsAPI.getById(document.id);
      setSelectedDocument(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading document:', error);
      setSelectedDocument(document);
      setViewDialogOpen(true);
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFile || !selectedDocument) {
      alert('Пожалуйста, выберите файл для загрузки');
      return;
    }

    try {
      // Конвертируем файл в base64 для отправки
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64File = e.target.result;
          const filePath = base64File; // Сохраняем как data URI
          
          // Отправляем данные о файле через обновление документа
          await documentsAPI.update(selectedDocument.id, {
            file_path: filePath,
            file_name: uploadFile.name,
            file_size: uploadFile.size,
            mime_type: uploadFile.type || 'application/pdf'
          });
          
          setUploadDialogOpen(false);
          setUploadFile(null);
          // Обновляем информацию о документе
          await handleViewDocument(selectedDocument);
          loadDocuments();
          alert('Файл успешно загружен');
        } catch (error) {
          console.error('Error uploading file:', error);
          alert('Ошибка при загрузке файла: ' + (error.response?.data?.error || error.message));
        }
      };
      reader.onerror = () => {
        alert('Ошибка при чтении файла');
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Ошибка при чтении файла');
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedDocument || !selectedDocument.template_id) {
      alert('Для генерации документа необходим шаблон');
      return;
    }

    try {
      await documentsAPI.generateFromTemplate(selectedDocument.id);
      // Обновляем информацию о документе
      await handleViewDocument(selectedDocument);
      loadDocuments();
      alert('Документ успешно сгенерирован из шаблона');
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Ошибка при генерации документа: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDownload = async (doc) => {
    try {
      // Если есть прямой путь к файлу (URL), открываем его
      if (doc.file_path && (doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://'))) {
        window.open(doc.file_path, '_blank');
        return;
      }

      // Если файл сохранен как data URI (base64)
      if (doc.file_path && doc.file_path.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = doc.file_path;
        link.setAttribute('download', doc.file_name || `document_${doc.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      // Если есть локальный путь, пытаемся скачать через API
      if (doc.file_path) {
        try {
          const response = await documentsAPI.download(doc.id);
          if (response.data instanceof Blob) {
            const url = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.file_name || `document_${doc.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          } else if (response.data.file_path) {
            // Если API вернул путь к файлу
            window.open(response.data.file_path, '_blank');
          }
        } catch (error) {
          console.error('Download error:', error);
          if (error.response?.status === 404) {
            alert('Файл еще не загружен. Пожалуйста, загрузите файл для этого документа.');
          } else {
            alert('Ошибка при скачивании документа: ' + (error.response?.data?.error || error.message));
          }
        }
      } else {
        // Если файла нет, показываем сообщение
        alert('Файл для этого документа еще не загружен. Пожалуйста, загрузите файл.');
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
                      <IconButton 
                        size="small" 
                        onClick={() => handleDownload(doc)}
                        title={doc.file_path ? "Скачать файл" : "Файл не загружен"}
                        disabled={!doc.file_path}
                      >
                        <DownloadIcon />
                      </IconButton>
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
                  {selectedDocument.file_path ? (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Путь к файлу:</Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {selectedDocument.file_path}
                      </Typography>
                    </Grid>
                  ) : (
                    <Grid item xs={12}>
                      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, mb: 2 }}>
                        <Typography variant="body2" color="warning.dark" gutterBottom>
                          ⚠️ Файл еще не загружен для этого документа
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          {selectedDocument.template_id && (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleGenerateFromTemplate}
                            >
                              Сгенерировать из шаблона
                            </Button>
                          )}
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<UploadIcon />}
                            onClick={() => setUploadDialogOpen(true)}
                          >
                            Загрузить файл
                          </Button>
                        </Box>
                      </Box>
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
            {selectedDocument && (
              <>
                <Button
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    handleDelete(selectedDocument);
                  }}
                  color="error"
                >
                  Удалить
                </Button>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(selectedDocument)}
                  variant="contained"
                  disabled={!selectedDocument.file_path}
                >
                  {selectedDocument.file_path ? 'Скачать PDF' : 'Файл не загружен'}
                </Button>
              </>
            )}
            <Button onClick={() => setViewDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog загрузки файла */}
        <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Загрузить файл для документа #{selectedDocument?.id}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <input
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Выбрать файл
                </Button>
              </label>
              {uploadFile && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Выбранный файл: <strong>{uploadFile.name}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Размер: {(uploadFile.size / 1024).toFixed(2)} KB
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Тип: {uploadFile.type || 'не определен'}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setUploadDialogOpen(false);
              setUploadFile(null);
            }}>
              Отмена
            </Button>
            <Button
              onClick={handleUploadFile}
              variant="contained"
              disabled={!uploadFile}
            >
              Загрузить
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
  );
}

export default Documents;

