import axios from 'axios';

export const funnelAPI = {
  getStages: () => {
    return axios.get('/api/funnel/stages');
  },
  
  createStage: (data) => {
    return axios.post('/api/funnel/stages', data);
  },
  
  updateStage: (id, data) => {
    return axios.put(`/api/funnel/stages/${id}`, data);
  },
  
  deleteStage: (id) => {
    return axios.delete(`/api/funnel/stages/${id}`);
  },
  
  updateLeadStage: (leadId, funnelStage) => {
    return axios.put(`/api/funnel/leads/${leadId}/stage`, { funnel_stage: funnelStage });
  }
};

