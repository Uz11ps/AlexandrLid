import axios from 'axios';

export const documentsAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/documents', { params });
  },
  
  getById: (id) => {
    return axios.get(`/api/documents/${id}`);
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
  },
  
  download: (id) => {
    return axios.get(`/api/documents/${id}/download`, { responseType: 'blob' });
  },
  
  uploadFile: (id, formData) => {
    return axios.post(`/api/documents/${id}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  generateFromTemplate: (id) => {
    return axios.post(`/api/documents/${id}/generate`);
  },
  
  delete: (id) => {
    return axios.delete(`/api/documents/${id}`);
  }
};

