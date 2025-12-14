import axios from 'axios';

export const ticketsAPI = {
  getAll: (params = {}) => {
    return axios.get('/api/tickets', { params });
  },
  
  getById: (id) => {
    return axios.get(`/api/tickets/${id}`);
  },
  
  create: (data) => {
    return axios.post('/api/tickets', data);
  },
  
  sendMessage: (ticketId, messageText) => {
    return axios.post(`/api/tickets/${ticketId}/messages`, {
      message_text: messageText
    });
  },
  
  update: (id, data) => {
    return axios.put(`/api/tickets/${id}`, data);
  }
};

