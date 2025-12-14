import axios from 'axios';

export const managersAPI = {
  getAll: () => {
    return axios.get('/api/managers');
  },
  
  getById: (id) => {
    return axios.get(`/api/managers/${id}`);
  },
  
  update: (id, data) => {
    return axios.put(`/api/managers/${id}`, data);
  },
  
  delete: (id) => {
    return axios.delete(`/api/managers/${id}`);
  }
};

