import io from 'socket.io-client';
import toast from 'react-hot-toast';

let socket = null;
let eventHandlers = new Map();

// Инициализация WebSocket соединения
export const initializeSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io('http://localhost:5000', {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket подключен');
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket отключен');
  });

  socket.on('error', (error) => {
    console.error('WebSocket ошибка:', error);
  });

  // Обработчики событий для привычек
  socket.on('habit_completed', (data) => {
    emitToHandlers('habit_completed', data);
    toast.success('Привычка выполнена! +10 очков', { icon: '✅' });
  });

  socket.on('streak_updated', (data) => {
    emitToHandlers('streak_updated', data);
  });

  socket.on('streak_milestone', (data) => {
    toast.success(`Стрик ${data.currentStreak} дней! Отличная работа! 🔥`);
  });

  socket.on('achievement_unlocked', (data) => {
    emitToHandlers('achievement_unlocked', data);
    toast.success(
      `Достижение разблокировано: ${data.achievement.title}! +${data.achievement.points} очков`,
      { 
        icon: data.achievement.icon || '🏆',
        duration: 5000,
      }
    );
  });

  socket.on('level_up', (data) => {
    emitToHandlers('level_up', data);
    toast.success(`Поздравляем! Вы достигли ${data.newLevel} уровня! 🎉`, {
      duration: 5000,
    });
  });

  // Обработчики для досок
  socket.on('task_created', (data) => {
    emitToHandlers('task_created', data);
  });

  socket.on('task_updated', (data) => {
    emitToHandlers('task_updated', data);
  });

  socket.on('task_deleted', (data) => {
    emitToHandlers('task_deleted', data);
  });

  socket.on('task_moved', (data) => {
    emitToHandlers('task_moved', data);
  });

  socket.on('reminder_triggered', (data) => {
    toast(`Напоминание: ${data.habitTitle}`, {
      icon: '⏰',
      duration: 5000,
    });
  });

  return socket;
};

// Подписка на события
export const on = (event, handler) => {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }
  eventHandlers.get(event).add(handler);

  // Возвращаем функцию для отписки
  return () => {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  };
};

// Отправка событий
export const emit = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket не подключен');
  }
};

// Присоединиться к комнате доски
export const joinBoard = (boardId) => {
  emit('join_board', { boardId });
};

// Покинуть комнату доски
export const leaveBoard = (boardId) => {
  emit('leave_board', { boardId });
};

// Отключение сокета
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  eventHandlers.clear();
};

// Получить экземпляр сокета
export const getSocket = () => socket;

// Внутренняя функция для вызова обработчиков
function emitToHandlers(event, data) {
  const handlers = eventHandlers.get(event);
  if (handlers) {
    handlers.forEach(handler => handler(data));
  }
}

export default {
  initializeSocket,
  on,
  emit,
  joinBoard,
  leaveBoard,
  disconnectSocket,
  getSocket,
};