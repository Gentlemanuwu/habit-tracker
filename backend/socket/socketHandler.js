const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Хранилище активных соединений
const activeConnections = new Map(); // userId -> Set of socket ids
const boardRooms = new Map(); // boardId -> Set of socket ids

module.exports = (io) => {
  // Middleware для аутентификации WebSocket соединений
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Верифицируем токен
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Добавляем информацию о пользователе в socket
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      
      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Обработка подключений
  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.userId} connected (socket: ${socket.id})`);

    // Добавляем соединение в активные
    if (!activeConnections.has(socket.userId)) {
      activeConnections.set(socket.userId, new Set());
    }
    activeConnections.get(socket.userId).add(socket.id);

    // Присоединение к комнате пользователя (для персональных уведомлений)
    socket.join(`user:${socket.userId}`);

    // === СОБЫТИЯ ДЛЯ ДОСОК ===

    // Присоединиться к обновлениям доски
    socket.on('join_board', (data) => {
      const { boardId } = data;
      const roomName = `board:${boardId}`;
      
      socket.join(roomName);
      
      // Сохраняем в boardRooms
      if (!boardRooms.has(boardId)) {
        boardRooms.set(boardId, new Set());
      }
      boardRooms.get(boardId).add(socket.id);
      
      console.log(`📋 User ${socket.userId} joined board ${boardId}`);
      
      // Уведомляем других участников
      socket.to(roomName).emit('user_joined_board', {
        userId: socket.userId,
        boardId,
      });
    });

    // Покинуть комнату доски
    socket.on('leave_board', (data) => {
      const { boardId } = data;
      const roomName = `board:${boardId}`;
      
      socket.leave(roomName);
      
      // Удаляем из boardRooms
      if (boardRooms.has(boardId)) {
        boardRooms.get(boardId).delete(socket.id);
        if (boardRooms.get(boardId).size === 0) {
          boardRooms.delete(boardId);
        }
      }
      
      console.log(`📋 User ${socket.userId} left board ${boardId}`);
    });

    // === СОБЫТИЯ ДЛЯ ПРИВЫЧЕК ===

    // Уведомление о выполнении привычки
    socket.on('habit_completed', (data) => {
      const { habitId, log, streak, achievements } = data;
      
      // Отправляем обратно клиенту
      socket.emit('habit_completed', {
        habitId,
        log,
        streak,
        achievements,
      });

      // Если были разблокированы достижения, отправляем уведомления
      if (achievements && achievements.length > 0) {
        achievements.forEach(achievement => {
          socket.emit('achievement_unlocked', {
            achievement,
          });
        });
      }

      // Если стрик обновился и достиг важной вехи
      if (streak && (streak.current_streak % 7 === 0 || streak.current_streak % 30 === 0)) {
        socket.emit('streak_milestone', {
          habitId,
          currentStreak: streak.current_streak,
          isMilestone: true,
        });
      }
    });

    // === ОБЩИЕ СОБЫТИЯ ===

    // Ping для проверки соединения
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Typing индикатор (опционально, для будущих комментариев)
    socket.on('typing', (data) => {
      const { boardId } = data;
      if (boardId) {
        socket.to(`board:${boardId}`).emit('user_typing', {
          userId: socket.userId,
          boardId,
        });
      }
    });

    // Отключение
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.userId} disconnected (socket: ${socket.id})`);
      
      // Удаляем из активных соединений
      if (activeConnections.has(socket.userId)) {
        activeConnections.get(socket.userId).delete(socket.id);
        if (activeConnections.get(socket.userId).size === 0) {
          activeConnections.delete(socket.userId);
        }
      }

      // Удаляем из всех комнат досок
      boardRooms.forEach((sockets, boardId) => {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            boardRooms.delete(boardId);
          }
        }
      });
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  // === ФУНКЦИИ ДЛЯ ОТПРАВКИ СОБЫТИЙ ИЗ API ===

  // Функция для отправки события всем пользователям в комнате доски
  const emitToBoardRoom = (boardId, event, data) => {
    io.to(`board:${boardId}`).emit(event, data);
  };

  // Функция для отправки события конкретному пользователю
  const emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Функция для отправки уведомления о достижении
  const notifyAchievement = (userId, achievement) => {
    emitToUser(userId, 'achievement_unlocked', { achievement });
  };

  // Функция для отправки уведомления о повышении уровня
  const notifyLevelUp = (userId, newLevel, totalPoints) => {
    emitToUser(userId, 'level_up', { newLevel, totalPoints });
  };

  // Функция для отправки напоминания
  const notifyReminder = (userId, habitId, habitTitle, message) => {
    emitToUser(userId, 'reminder_triggered', {
      habitId,
      habitTitle,
      message,
    });
  };

  // Экспортируем функции для использования в API routes
  io.emitToBoardRoom = emitToBoardRoom;
  io.emitToUser = emitToUser;
  io.notifyAchievement = notifyAchievement;
  io.notifyLevelUp = notifyLevelUp;
  io.notifyReminder = notifyReminder;

  // Статистика WebSocket соединений
  setInterval(() => {
    console.log(`📊 WebSocket Stats: ${activeConnections.size} users, ${io.sockets.sockets.size} sockets, ${boardRooms.size} active boards`);
  }, 60000); // каждую минуту
};