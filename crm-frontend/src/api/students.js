import axios from 'axios';

export const studentsAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/students', { params });
  },
  
  getById: (id) => {
    return axios.get(`/api/students/${id}`);
  },
  
  convertLead: (data) => {
    return axios.post('/api/students/convert', data);
  },
  
  update: (id, data) => {
    return axios.put(`/api/students/${id}`, data);
  },
  
  addPayment: (id, data) => {
    return axios.post(`/api/students/${id}/payments`, data);
  }
};

