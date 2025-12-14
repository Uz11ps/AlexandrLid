import axios from 'axios';

export const productsAPI = {
  // Courses
  getCourses: () => {
    return axios.get('/api/products/courses');
  },
  
  getCourse: (id) => {
    return axios.get(`/api/products/courses/${id}`);
  },
  
  createCourse: (data) => {
    return axios.post('/api/products/courses', data);
  },
  
  updateCourse: (id, data) => {
    return axios.put(`/api/products/courses/${id}`, data);
  },
  
  // Packages
  getPackages: (params = {}) => {
    return axios.get('/api/products/packages', { params });
  },
  
  createPackage: (data) => {
    return axios.post('/api/products/packages', data);
  },
  
  // Services
  getServices: () => {
    return axios.get('/api/products/services');
  },
  
  createService: (data) => {
    return axios.post('/api/products/services', data);
  }
};

