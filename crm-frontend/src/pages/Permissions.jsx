import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { permissionsAPI } from '../api/permissions';
import axios from 'axios';

const RESOURCES = [
  'leads', 'students', 'deals', 'products', 'tasks',
  'analytics', 'templates', 'documents', 'bot_admin', 'chat', 'permissions'
];

const ACTIONS = ['read', 'create', 'update', 'delete'];

const ROLES = ['admin', 'manager', 'marketer', 'accountant'];

function Permissions() {
  const [tab, setTab] = useState(0);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [userPermissions, setUserPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState('admin');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
    loadManagers();
  }, []);

  useEffect(() => {
    if (tab === 0 && selectedRole) {
      loadRolePermissions(selectedRole);
    } else if (tab === 1 && selectedUserId) {
      loadUserPermissions(selectedUserId);
    }
  }, [tab, selectedRole, selectedUserId]);

  // Загружаем права при первом открытии вкладки
  useEffect(() => {
    if (tab === 0 && selectedRole && permissions.length > 0) {
      loadRolePermissions(selectedRole);
    }
  }, [permissions.length]);

  useEffect(() => {
    if (tab === 1 && selectedUserId && managers.length > 0 && permissions.length > 0) {
      loadUserPermissions(selectedUserId);
    }
  }, [managers.length, permissions.length]);

  const loadPermissions = async () => {
    try {
      const response = await permissionsAPI.getAll();
      setPermissions(response.data || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await axios.get('/api/managers');
      setManagers(response.data || []);
      if (response.data && response.data.length > 0 && !selectedUserId) {
        setSelectedUserId(response.data[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const loadRolePermissions = async (role) => {
    try {
      setLoading(true);
      const response = await permissionsAPI.getRolePermissions(role);
      const permissionsMap = {};
      
      // Для роли admin все права должны быть выбранными по умолчанию
      const isAdmin = role === 'admin';
      
      response.data.forEach(p => {
        if (!permissionsMap[p.resource]) {
          permissionsMap[p.resource] = {};
        }
        // Если роль admin, показываем все права как выбранные
        // Иначе используем значение из базы данных
        permissionsMap[p.resource][p.action] = isAdmin ? true : (p.granted === true);
      });
      
      setRolePermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      // При ошибке для admin показываем все права как выбранные
      if (role === 'admin') {
        const adminPermissionsMap = {};
        RESOURCES.forEach(resource => {
          adminPermissionsMap[resource] = {};
          ACTIONS.forEach(action => {
            adminPermissionsMap[resource][action] = true;
          });
        });
        setRolePermissions(adminPermissionsMap);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId) => {
    try {
      setLoading(true);
      const response = await permissionsAPI.getUserPermissions(userId);
      const permissionsMap = {};
      response.data.forEach(p => {
        if (!permissionsMap[p.resource]) {
          permissionsMap[p.resource] = {};
        }
        permissionsMap[p.resource][p.action] = p.granted;
      });
      setUserPermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRolePermissionChange = async (resource, action, granted) => {
    try {
      // Для роли admin нельзя изменять права
      if (selectedRole === 'admin') {
        alert('Роль администратора всегда имеет все права доступа. Изменение прав для этой роли невозможно.');
        return;
      }

      const currentPermissions = rolePermissions[resource] || {};
      const newPermissions = { ...currentPermissions, [action]: granted };
      const newRolePermissions = { ...rolePermissions, [resource]: newPermissions };
      setRolePermissions(newRolePermissions);

      // Получить все разрешенные права для роли
      const permissionIds = [];
      permissions.forEach(p => {
        if (newRolePermissions[p.resource] && newRolePermissions[p.resource][p.action]) {
          permissionIds.push(p.id);
        }
      });

      await permissionsAPI.updateRolePermissions(selectedRole, permissionIds);
      await loadRolePermissions(selectedRole);
    } catch (error) {
      console.error('Error updating role permission:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ошибка при обновлении прав';
      alert(errorMessage);
      // Перезагружаем права в случае ошибки
      await loadRolePermissions(selectedRole);
    }
  };

  const handleUserPermissionChange = async (resource, action, granted) => {
    try {
      const currentPermissions = userPermissions[resource] || {};
      const newPermissions = { ...currentPermissions, [action]: granted };
      const newUserPermissions = { ...userPermissions, [resource]: newPermissions };
      setUserPermissions(newUserPermissions);

      // Подготовить массив переопределений
      const permissionOverrides = [];
      permissions.forEach(p => {
        if (newUserPermissions[p.resource] && newUserPermissions[p.resource][p.action] !== undefined) {
          permissionOverrides.push({
            permission_id: p.id,
            granted: newUserPermissions[p.resource][p.action]
          });
        }
      });

      await permissionsAPI.updateUserPermissions(selectedUserId, permissionOverrides);
      await loadUserPermissions(selectedUserId);
    } catch (error) {
      console.error('Error updating user permission:', error);
      alert('Ошибка при обновлении прав');
    }
  };

  const getPermissionId = (resource, action) => {
    const perm = permissions.find(p => p.resource === resource && p.action === action);
    return perm ? perm.id : null;
  };

  const isPermissionGranted = (resource, action, isRoleTab) => {
    if (isRoleTab) {
      return rolePermissions[resource] && rolePermissions[resource][action] === true;
    } else {
      return userPermissions[resource] && userPermissions[resource][action] === true;
    }
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Управление правами доступа
      </Typography>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Права по ролям" />
        <Tab label="Права по пользователям" />
      </Tabs>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Роль</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {ROLES.map(role => (
                  <MenuItem key={role} value={role}>
                    {role === 'admin' ? 'Администратор' :
                     role === 'manager' ? 'Менеджер' :
                     role === 'marketer' ? 'Маркетолог' :
                     'Бухгалтер'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Раздел</TableCell>
                  <TableCell align="center">Просмотр</TableCell>
                  <TableCell align="center">Создание</TableCell>
                  <TableCell align="center">Редактирование</TableCell>
                  <TableCell align="center">Удаление</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {RESOURCES.map(resource => (
                  <TableRow key={resource}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {resource === 'leads' ? 'Лиды' :
                         resource === 'students' ? 'Студенты' :
                         resource === 'deals' ? 'Сделки' :
                         resource === 'products' ? 'Продукты' :
                         resource === 'tasks' ? 'Задачи' :
                         resource === 'analytics' ? 'Аналитика' :
                         resource === 'templates' ? 'Шаблоны' :
                         resource === 'documents' ? 'Документы' :
                         resource === 'bot_admin' ? 'Админка бота' :
                         resource === 'chat' ? 'Чат' :
                         'Права доступа'}
                      </Typography>
                    </TableCell>
                    {ACTIONS.map(action => (
                      <TableCell key={action} align="center">
                        {action === 'read' ? (
                          <Checkbox
                            checked={isPermissionGranted(resource, action, true)}
                            onChange={(e) => handleRolePermissionChange(resource, action, e.target.checked)}
                            disabled={selectedRole === 'admin'}
                          />
                        ) : (
                          <Checkbox
                            checked={isPermissionGranted(resource, action, true)}
                            onChange={(e) => handleRolePermissionChange(resource, action, e.target.checked)}
                            disabled={selectedRole === 'admin' || !isPermissionGranted(resource, 'read', true)}
                          />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Пользователь</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <MenuItem value="">Выберите пользователя</MenuItem>
                {managers.map(manager => (
                  <MenuItem key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedUserId ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Раздел</TableCell>
                    <TableCell align="center">Просмотр</TableCell>
                    <TableCell align="center">Создание</TableCell>
                    <TableCell align="center">Редактирование</TableCell>
                    <TableCell align="center">Удаление</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RESOURCES.map(resource => (
                    <TableRow key={resource}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {resource === 'leads' ? 'Лиды' :
                           resource === 'students' ? 'Студенты' :
                           resource === 'deals' ? 'Сделки' :
                           resource === 'products' ? 'Продукты' :
                           resource === 'tasks' ? 'Задачи' :
                           resource === 'analytics' ? 'Аналитика' :
                           resource === 'templates' ? 'Шаблоны' :
                           resource === 'documents' ? 'Документы' :
                           resource === 'bot_admin' ? 'Админка бота' :
                           resource === 'chat' ? 'Чат' :
                           'Права доступа'}
                        </Typography>
                      </TableCell>
                      {ACTIONS.map(action => (
                        <TableCell key={action} align="center">
                          {action === 'read' ? (
                            <Checkbox
                              checked={isPermissionGranted(resource, action, false)}
                              onChange={(e) => handleUserPermissionChange(resource, action, e.target.checked)}
                            />
                          ) : (
                            <Checkbox
                              checked={isPermissionGranted(resource, action, false)}
                              onChange={(e) => handleUserPermissionChange(resource, action, e.target.checked)}
                              disabled={!isPermissionGranted(resource, 'read', false)}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Выберите пользователя для управления правами
            </Typography>
          )}
        </Paper>
      )}
    </Container>
  );
}

export default Permissions;

