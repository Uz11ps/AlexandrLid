import axios from 'axios';

export const botAdminAPI = {
  // Statistics
  getStats: () => {
    return axios.get('/api/bot-admin/stats');
  },
  
  // Users
  getAllUsers: (params = {}) => {
    return axios.get('/api/bot-admin/users', { params });
  },
  
  getUserById: (userId) => {
    return axios.get(`/api/bot-admin/users/${userId}`);
  },
  
  banUser: (userId) => {
    return axios.post(`/api/bot-admin/users/${userId}/ban`);
  },
  
  unbanUser: (userId) => {
    return axios.post(`/api/bot-admin/users/${userId}/unban`);
  },
  
  // Broadcasts
  getBroadcasts: () => {
    return axios.get('/api/bot-admin/broadcasts');
  },
  
  createBroadcast: (data) => {
    return axios.post('/api/bot-admin/broadcasts', data);
  },
  
  sendBroadcast: (id) => {
    return axios.post(`/api/bot-admin/broadcasts/${id}/send`);
  },
  
  // Autofunnels
  getAutofunnels: () => {
    return axios.get('/api/bot-admin/autofunnels');
  },
  
  createAutofunnel: (data) => {
    return axios.post('/api/bot-admin/autofunnels', data);
  },
  
  updateAutofunnel: (id, data) => {
    return axios.put(`/api/bot-admin/autofunnels/${id}`, data);
  },
  
  // Lead Magnets
  getLeadMagnets: () => {
    return axios.get('/api/bot-admin/lead-magnets');
  },
  
  createLeadMagnet: (data) => {
    return axios.post('/api/bot-admin/lead-magnets', data);
  },
  
  activateLeadMagnet: (id) => {
    return axios.post(`/api/bot-admin/lead-magnets/${id}/activate`);
  },
  
  // Giveaways
  getGiveaways: () => {
    return axios.get('/api/bot-admin/giveaways');
  },
  
  createGiveaway: (data) => {
    return axios.post('/api/bot-admin/giveaways', data);
  },
  
  // Export
  exportData: (type, format) => {
    return axios.get(`/api/bot-admin/export/${type}/${format}`, {
      responseType: 'blob'
    });
  }
};

