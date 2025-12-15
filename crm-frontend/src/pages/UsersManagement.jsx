import React, { useState, useEffect, Fragment } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import axios from 'axios';
import { permissionsAPI } from '../api/permissions';

function UsersManagement() {
  const [tab, setTab] = useState(0);
  const [managers, setManagers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'manager',
    is_active: true
  });
  const [newRole, setNewRole] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (tab === 0) {
        await loadManagers();
      } else if (tab === 1) {
        await loadRoles();
        await loadPermissions();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await axios.get('/api/managers');
      setManagers(response.data || []);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const loadRoles = async () => {
    try {
      // Получаем список ролей из API
      const response = await axios.get('/api/roles');
      setRoles(response.data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
      // Fallback на стандартные роли при ошибке
      const standardRoles = ['admin', 'manager', 'marketer', 'accountant'];
      setRoles(standardRoles.map(name => ({ name, description: getRoleDescription(name) })));
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await permissionsAPI.getAll();
      setPermissions(response.data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin': return 'Полный доступ ко всем функциям';
      case 'manager': return 'Работа с лидами и перепиской';
      case 'marketer': return 'Маркетинг и аналитика';
      case 'accountant': return 'Просмотр финансовых данных';
      default: return '';
    }
  };

  const handleCreateUser = async () => {
    try {
      console.log('Creating user with data:', newUser);
      const response = await axios.post('/api/auth/register', {
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role || 'manager',
        is_active: newUser.is_active !== undefined ? newUser.is_active : true
      });
      console.log('User created successfully:', response.data);
      setUserDialogOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'manager', is_active: true });
      loadManagers();
      alert('Пользователь успешно создан');
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
      alert('Ошибка при создании пользователя: ' + errorMessage);
    }
  };

  const handleUpdateUser = async () => {
    try {
      await axios.put(`/api/managers/${selectedUser.id}`, {
        name: selectedUser.name,
        role: selectedUser.role,
        is_active: selectedUser.is_active
      });
      setUserDialogOpen(false);
      setSelectedUser(null);
      loadManagers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Ошибка при обновлении пользователя');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
      await axios.delete(`/api/managers/${userId}`);
      loadManagers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка при удалении пользователя');
    }
  };

  const handleOpenPermissionsDialog = async (user) => {
    setSelectedUser(user);
    try {
      const response = await permissionsAPI.getUserPermissions(user.id);
      // Загружаем права пользователя
      setPermissionsDialogOpen(true);
    } catch (error) {
      console.error('Error loading user permissions:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      // Проверяем, что роль с таким именем не существует
      if (roles.some(r => r.name === newRole.name)) {
        alert('Роль с таким именем уже существует');
        return;
      }
      
      // В реальном приложении здесь был бы API вызов для создания роли
      // Пока просто добавляем роль в локальный список
      const role = {
        name: newRole.name,
        description: newRole.description
      };
      
      setRoles([...roles, role]);
      setRoleDialogOpen(false);
      setNewRole({ name: '', description: '' });
      alert('Роль успешно создана');
    } catch (error) {
      console.error('Error creating role:', error);
      alert('Ошибка при создании роли: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleUpdateRole = async () => {
    try {
      if (!selectedRole || !selectedRole.id) return;
      
      console.log('Updating role with data:', selectedRole);
      const response = await axios.put(`/api/roles/${selectedRole.id}`, {
        name: selectedRole.name,
        description: selectedRole.description
      });
      console.log('Role updated successfully:', response.data);
      setRoleDialogOpen(false);
      setSelectedRole(null);
      await loadRoles(); // Перезагружаем список ролей
      alert('Роль успешно обновлена');
    } catch (error) {
      console.error('Error updating role:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message;
      alert('Ошибка при обновлении роли: ' + errorMessage);
    }
  };

  return (
    <>
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Управление пользователями</Typography>
      </Box>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Пользователи" />
        <Tab label="Роли" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedUser(null);
                setUserDialogOpen(true);
              }}
            >
              Создать пользователя
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Имя</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {managers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell>{manager.id}</TableCell>
                    <TableCell>{manager.email}</TableCell>
                    <TableCell>{manager.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={manager.role}
                        color={manager.role === 'admin' ? 'error' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={manager.is_active ? 'Активен' : 'Неактивен'}
                        color={manager.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser({ ...manager });
                          setUserDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenPermissionsDialog(manager)}
                      >
                        <SecurityIcon />
                      </IconButton>
                      {manager.role !== 'admin' && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteUser(manager.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tab === 1 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log('Create role button clicked');
                setSelectedRole(null);
                setNewRole({ name: '', description: '' });
                setRoleDialogOpen(true);
                console.log('roleDialogOpen set to true');
              }}
            >
              Создать роль
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.name}>
                    <TableCell>
                      <Chip
                        label={role.name}
                        color={role.name === 'admin' ? 'error' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedRole(role);
                          setPermissionsDialogOpen(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        Управление правами
                      </Button>
                      {role.name !== 'admin' && (
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedRole(role);
                            setRoleDialogOpen(true);
                          }}
                        >
                          Редактировать
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Диалог создания/редактирования пользователя */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Редактировать пользователя' : 'Создать пользователя'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={selectedUser ? selectedUser.email : newUser.email}
            onChange={(e) => {
              if (selectedUser) {
                setSelectedUser({ ...selectedUser, email: e.target.value });
              } else {
                setNewUser({ ...newUser, email: e.target.value });
              }
            }}
            disabled={!!selectedUser}
            sx={{ mt: 2 }}
          />
          {!selectedUser && (
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              sx={{ mt: 2 }}
            />
          )}
          <TextField
            fullWidth
            label="Имя"
            value={selectedUser ? selectedUser.name : newUser.name}
            onChange={(e) => {
              if (selectedUser) {
                setSelectedUser({ ...selectedUser, name: e.target.value });
              } else {
                setNewUser({ ...newUser, name: e.target.value });
              }
            }}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Роль</InputLabel>
            <Select
              value={selectedUser ? selectedUser.role : newUser.role}
              onChange={(e) => {
                if (selectedUser) {
                  setSelectedUser({ ...selectedUser, role: e.target.value });
                } else {
                  setNewUser({ ...newUser, role: e.target.value });
                }
              }}
              disabled={!roles || roles.length === 0}
            >
              {roles && roles.length > 0 ? (
                roles.map(role => (
                  <MenuItem key={role.name} value={role.name}>
                    {role.name === 'admin' ? 'Администратор' :
                     role.name === 'manager' ? 'Менеджер' :
                     role.name === 'marketer' ? 'Маркетолог' :
                     role.name === 'accountant' ? 'Бухгалтер' :
                     role.name} - {role.description}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>Загрузка ролей...</MenuItem>
              )}
            </Select>
          </FormControl>
          {selectedUser && (
            <FormControlLabel
              control={
                <Switch
                  checked={selectedUser.is_active}
                  onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.checked })}
                />
              }
              label="Активен"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={selectedUser ? handleUpdateUser : handleCreateUser}
            variant="contained"
            disabled={!selectedUser && (!newUser.email || !newUser.password || !newUser.name)}
          >
            {selectedUser ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания/редактирования роли */}
      <Dialog
        open={roleDialogOpen}
        onClose={() => {
          setRoleDialogOpen(false);
          setSelectedRole(null);
          setNewRole({ name: '', description: '' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedRole ? 'Редактировать роль' : 'Создать роль'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название роли"
            value={selectedRole ? selectedRole.name : newRole.name}
            onChange={(e) => {
              if (selectedRole) {
                setSelectedRole({ ...selectedRole, name: e.target.value });
              } else {
                setNewRole({ ...newRole, name: e.target.value });
              }
            }}
            disabled={selectedRole?.name === 'admin'}
            sx={{ mt: 2 }}
            helperText={selectedRole?.name === 'admin' ? 'Название роли администратора нельзя изменить' : ''}
          />
          <TextField
            fullWidth
            label="Описание"
            value={selectedRole ? selectedRole.description : newRole.description}
            onChange={(e) => {
              if (selectedRole) {
                setSelectedRole({ ...selectedRole, description: e.target.value });
              } else {
                setNewRole({ ...newRole, description: e.target.value });
              }
            }}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRoleDialogOpen(false);
              setSelectedRole(null);
              setNewRole({ name: '', description: '' });
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={selectedRole ? handleUpdateRole : handleCreateRole}
            variant="contained"
            disabled={!selectedRole && (!newRole.name || !newRole.description)}
          >
            {selectedRole ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог управления правами */}
      <Dialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Права доступа: {selectedUser?.name || selectedRole?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedUser
              ? 'Настройте права доступа для этого пользователя'
              : 'Настройте права доступа для этой роли'}
          </Typography>
          {/* Здесь будет компонент управления правами из Permissions.jsx */}
          <Typography variant="body2" color="text.secondary">
            Перейдите в раздел "Права доступа" для детальной настройки
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsDialogOpen(false)}>Закрыть</Button>
          <Button
            onClick={() => {
              setPermissionsDialogOpen(false);
              // Переход на страницу прав доступа
              window.location.href = '/permissions';
            }}
            variant="contained"
          >
            Открыть настройки прав
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
}

export default UsersManagement;

