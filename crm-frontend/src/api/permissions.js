import axios from 'axios';

export const permissionsAPI = {
  getAll: () => {
    return axios.get('/api/permissions');
  },
  
  getRolePermissions: (role) => {
    return axios.get(`/api/permissions/roles/${role}`);
  },
  
  updateRolePermissions: (role, permissionIds) => {
    return axios.put(`/api/permissions/roles/${role}`, {
      permission_ids: permissionIds
    });
  },
  
  getUserPermissions: (userId) => {
    return axios.get(`/api/permissions/users/${userId}`);
  },
  
  updateUserPermissions: (userId, permissions) => {
    return axios.put(`/api/permissions/users/${userId}`, {
      permissions
    });
  }
};

