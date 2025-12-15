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
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { productsAPI } from '../api/products';

function Products() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [courses, setCourses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'RUB',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 0) {
        const response = await productsAPI.getCourses();
        setCourses(response.data || []);
      } else if (tab === 1) {
        const response = await productsAPI.getPackages();
        setPackages(response.data || []);
      } else {
        const response = await productsAPI.getServices();
        setServices(response.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'RUB',
      status: 'active'
    });
    setDialogOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      price: item.price || item.base_price || '',
      currency: item.currency || 'RUB',
      status: item.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (tab === 0) {
        if (editingItem) {
          await productsAPI.updateCourse(editingItem.id, formData);
        } else {
          await productsAPI.createCourse(formData);
        }
      } else if (tab === 1) {
        if (editingItem) {
          // Update package
        } else {
          await productsAPI.createPackage(formData);
        }
      } else {
        if (editingItem) {
          // Update service
        } else {
          await productsAPI.createService(formData);
        }
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
          <Typography variant="h4">Продукты и тарифы</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Создать
          </Button>
        </Box>

        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Курсы" />
          <Tab label="Тарифы" />
          <Tab label="Услуги" />
        </Tabs>

        {tab === 0 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map((course) => (
                  <TableRow 
                    key={course.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/products/courses/${course.id}`)}
                  >
                    <TableCell>{course.id}</TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.description?.substring(0, 50) || '-'}...</TableCell>
                    <TableCell>
                      <Chip
                        label={course.status}
                        color={course.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => handleEdit(course)}>
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
                  <TableCell>Название</TableCell>
                  <TableCell>Курс</TableCell>
                  <TableCell>Цена</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>{pkg.id}</TableCell>
                    <TableCell>{pkg.name}</TableCell>
                    <TableCell>{pkg.course_name || '-'}</TableCell>
                    <TableCell>{pkg.price} {pkg.currency}</TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.status}
                        color={pkg.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(pkg)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 2 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Цена</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.id}</TableCell>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{service.description?.substring(0, 50) || '-'}...</TableCell>
                    <TableCell>{service.price} {service.currency}</TableCell>
                    <TableCell>{service.service_type || '-'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(service)}>
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
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingItem ? 'Редактировать' : 'Создать'} {tab === 0 ? 'курс' : tab === 1 ? 'тариф' : 'услугу'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Описание"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              label="Цена"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              sx={{ mt: 2 }}
            />
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

export default Products;

