import axios from 'axios';

export const documentsAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/documents', { params });
  },
  
  getTemplates: (params = {}) => {
    return axios.get('/api/documents/templates', { params });
  },
  
  createTemplate: (data) => {
    return axios.post('/api/documents/templates', data);
  },
  
  create: (data) => {
    return axios.post('/api/documents', data);
  },
  
  update: (id, data) => {
    return axios.put(`/api/documents/${id}`, data);
  }
};

