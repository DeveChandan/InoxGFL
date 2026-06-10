import axios from 'axios';

const api = axios.create({
  // In BTP, the Approuter handles routing. We use a relative path so the 
  // Approuter catches the request and proxies it to the backend module.
  baseURL: '/api',
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('X-InoxGFL-Token', token);
      } else {
        (config.headers as any)['X-InoxGFL-Token'] = token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
