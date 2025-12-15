import axios from 'axios';

export const leadsAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/leads', { params });
  },
  
  getById: (id) => {
    return axios.get(`/api/leads/${id}`);
  },
  
  create: (data) => {
    return axios.post('/api/leads', data);
  },
  
  update: (id, data) => {
    return axios.put(`/api/leads/${id}`, data);
  },
  
  addComment: (id, comment_text) => {
    return axios.post(`/api/leads/${id}/comments`, { comment_text });
  },
  
  sendMessage: (id, message_text) => {
    return axios.post(`/api/leads/${id}/message`, { message_text });
  },
  
  delete: (id) => {
    return axios.delete(`/api/leads/${id}`);
  }
};

