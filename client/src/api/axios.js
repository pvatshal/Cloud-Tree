import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.PROD
    ? '/api'                        // Docker/production — nginx proxy
    : 'http://localhost:8000/api'   // Local dev
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;