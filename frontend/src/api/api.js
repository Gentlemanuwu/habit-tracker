import axios from 'axios';
import toast from 'react-hot-toast';

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.error?.message || 'Произошла ошибка';
      
      // Если 401 - перенаправляем на логин
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        toast.error('Сессия истекла. Войдите снова.');
      } else {
        toast.error(message);
      }
    } else {
      toast.error('Ошибка сети. Проверьте подключение.');
    }
    
    return Promise.reject(error);
  }
);

export default api;