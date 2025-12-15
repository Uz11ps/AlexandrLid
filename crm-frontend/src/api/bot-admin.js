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
  
  updateBroadcast: (id, data) => {
    return axios.put(`/api/bot-admin/broadcasts/${id}`, data);
  },
  
  deleteBroadcast: (id) => {
    return axios.delete(`/api/bot-admin/broadcasts/${id}`);
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
  
  deleteAutofunnel: (id) => {
    return axios.delete(`/api/bot-admin/autofunnels/${id}`);
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
  
  updateLeadMagnet: (id, data) => {
    return axios.put(`/api/bot-admin/lead-magnets/${id}`, data);
  },
  
  deleteLeadMagnet: (id) => {
    return axios.delete(`/api/bot-admin/lead-magnets/${id}`);
  },
  
  // Giveaways
  getGiveaways: () => {
    return axios.get('/api/bot-admin/giveaways');
  },
  
  createGiveaway: (data) => {
    return axios.post('/api/bot-admin/giveaways', data);
  },
  
  updateGiveaway: (id, data) => {
    return axios.put(`/api/bot-admin/giveaways/${id}`, data);
  },
  
  deleteGiveaway: (id) => {
    return axios.delete(`/api/bot-admin/giveaways/${id}`);
  },
  
  // Export
  exportData: (type, format) => {
    return axios.get(`/api/bot-admin/export/${type}/${format}`, {
      responseType: 'blob'
    });
  },
  
  // Settings
  getSettings: () => {
    return axios.get('/api/bot-admin/settings');
  },
  
  updateChannelSettings: (data) => {
    return axios.put('/api/bot-admin/settings/channel', data);
  },

  updateRateLimits: (data) => {
    return axios.put('/api/bot-admin/settings/rate-limits', data);
  },
  
  // Giveaway winners
  getGiveawayParticipants: (id) => {
    return axios.get(`/api/bot-admin/giveaways/${id}/participants`);
  },
  
  selectGiveawayWinners: (id, selectionType) => {
    return axios.post(`/api/bot-admin/giveaways/${id}/winners`, {
      selection_type: selectionType
    });
  }
};

