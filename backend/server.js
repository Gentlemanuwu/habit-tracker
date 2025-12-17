const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const config = require('./config/config');
const { errorHandler, notFoundHandler } = require('./utils/errors');

// Создание Express приложения
const app = express();
const server = http.createServer(app);

// Настройка Socket.IO
const io = socketIo(server, {
  cors: config.cors,
});

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов в режиме разработки
if (config.server.env === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Базовый маршрут
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Трекер привычек API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      boards: '/api/boards',
      tasks: '/api/tasks',
      habits: '/api/habits',
      achievements: '/api/achievements',
      reminders: '/api/reminders',
    },
  });
});

// API маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/boards', require('./routes/boards'));
app.use('/api/columns', require('./routes/columns'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/habits', require('./routes/habits'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/user', require('./routes/user'));

// WebSocket обработчики
const socketHandler = require('./socket/socketHandler');
socketHandler(io);

// Обработка несуществующих маршрутов
app.use(notFoundHandler);

// Обработчик ошибок (должен быть последним)
app.use(errorHandler);

// Запуск сервера
server.listen(config.server.port, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Трекер привычек - Backend Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server running on port ${config.server.port}`);
  console.log(`🌍 Environment: ${config.server.env}`);
  console.log(`🔗 API URL: http://localhost:${config.server.port}/api`);
  console.log(`🔌 WebSocket: http://localhost:${config.server.port}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = { app, server, io };