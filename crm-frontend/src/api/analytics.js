import axios from 'axios';

export const analyticsAPI = {
  getDashboard: () => {
    return axios.get('/api/analytics/dashboard');
  },
  
  getFunnel: (params = {}) => {
    return axios.get('/api/analytics/funnel', { params });
  },
  
  getFinancial: (params = {}) => {
    return axios.get('/api/analytics/financial', { params });
  },
  
  getManagers: () => {
    return axios.get('/api/analytics/managers');
  },
  
  getSources: (params = {}) => {
    return axios.get('/api/analytics/sources', { params });
  },
  
  getManagerEfficiency: () => {
    return axios.get('/api/analytics/manager-efficiency');
  },
  
  getUserActivity: (params = {}) => {
    return axios.get('/api/analytics/user-activity', { params });
  }
};

