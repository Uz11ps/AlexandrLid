import axios from 'axios';

export const templatesAPI = {
  getMessages: (params = {}) => {
    return axios.get('/api/templates/messages', { params });
  },
  
  createMessage: (data) => {
    return axios.post('/api/templates/messages', data);
  },
  
  updateMessage: (id, data) => {
    return axios.put(`/api/templates/messages/${id}`, data);
  },
  
  getObjections: (params = {}) => {
    return axios.get('/api/templates/objections', { params });
  },
  
  createObjection: (data) => {
    return axios.post('/api/templates/objections', data);
  }
};

