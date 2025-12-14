import axios from 'axios';

export const dealsAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/deals', { params });
  },
  
  getById: (id) => {
    return axios.get(`/api/deals/${id}`);
  },
  
  create: (data) => {
    return axios.post('/api/deals', data);
  },
  
  update: (id, data) => {
    return axios.put(`/api/deals/${id}`, data);
  }
};

