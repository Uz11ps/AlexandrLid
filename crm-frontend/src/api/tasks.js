import axios from 'axios';

export const tasksAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/tasks', { params });
  },
  
  getById: (id) => {
    return axios.get(`/api/tasks/${id}`);
  },
  
  create: (data) => {
    return axios.post('/api/tasks', data);
  },
  
  update: (id, data) => {
    return axios.put(`/api/tasks/${id}`, data);
  },
  
  delete: (id) => {
    return axios.delete(`/api/tasks/${id}`);
  }
};

