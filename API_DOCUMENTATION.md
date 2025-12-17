# API Documentation - Трекер привычек БАСНИКОВ

## Базовый URL
```
http://localhost:5000/api
```

## Аутентификация
Все защищенные endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

---

## 🔐 Аутентификация

### POST /auth/register
Регистрация нового пользователя

**Request Body:**
```json
{
  "username": "basnikov",
  "email": "basnikov@example.com",
  "password": "secure_password"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "basnikov",
      "email": "basnikov@example.com",
      "total_points": 0,
      "level": 1
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/login
Вход пользователя

**Request Body:**
```json
{
  "email": "basnikov@example.com",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "basnikov",
      "email": "basnikov@example.com",
      "total_points": 150,
      "level": 3
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### GET /auth/me
Получить информацию о текущем пользователе (требует авторизации)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "basnikov",
    "email": "basnikov@example.com",
    "total_points": 150,
    "level": 3,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 📊 Доски (Kanban Boards)

### GET /boards
Получить все доски пользователя

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Мои проекты",
      "description": "Основная рабочая доска",
      "color": "#6366f1",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /boards
Создать новую доску

**Request Body:**
```json
{
  "title": "Новая доска",
  "description": "Описание доски",
  "color": "#6366f1"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "title": "Новая доска",
    "description": "Описание доски",
    "color": "#6366f1",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /boards/:id
Обновить доску

**Request Body:**
```json
{
  "title": "Обновленное название",
  "description": "Новое описание"
}
```

### DELETE /boards/:id
Удалить доску

**Response (200):**
```json
{
  "success": true,
  "message": "Board deleted successfully"
}
```

### GET /boards/:id/columns
Получить все колонки доски

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "board_id": 1,
      "title": "Не начато",
      "position": 0,
      "color": "#ef4444",
      "tasks": [
        {
          "id": 1,
          "title": "Изучить архитектуру",
          "description": "Ознакомиться с документацией",
          "position": 0,
          "priority": "high",
          "due_date": "2024-12-31",
          "completed": false
        }
      ]
    }
  ]
}
```

---

## 📝 Колонки

### POST /columns
Создать новую колонку

**Request Body:**
```json
{
  "board_id": 1,
  "title": "В работе",
  "position": 1,
  "color": "#f59e0b"
}
```

### PUT /columns/:id
Обновить колонку

**Request Body:**
```json
{
  "title": "Обновленное название",
  "position": 2
}
```

### DELETE /columns/:id
Удалить колонку

---

## ✅ Задачи

### POST /tasks
Создать новую задачу

**Request Body:**
```json
{
  "column_id": 1,
  "title": "Новая задача",
  "description": "Описание задачи",
  "position": 0,
  "priority": "medium",
  "due_date": "2024-12-31",
  "tags": ["работа", "важное"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "column_id": 1,
    "title": "Новая задача",
    "description": "Описание задачи",
    "position": 0,
    "priority": "medium",
    "due_date": "2024-12-31",
    "completed": false,
    "tags": ["работа", "важное"],
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /tasks/:id
Обновить задачу

**Request Body:**
```json
{
  "title": "Обновленная задача",
  "description": "Новое описание",
  "priority": "high",
  "completed": true
}
```

### DELETE /tasks/:id
Удалить задачу

### PUT /tasks/:id/move
Переместить задачу в другую колонку

**Request Body:**
```json
{
  "column_id": 2,
  "position": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "column_id": 2,
    "position": 1,
    "title": "Задача",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🎯 Привычки

### GET /habits
Получить все привычки пользователя

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Утренняя зарядка",
      "description": "Физические упражнения каждое утро",
      "frequency": "daily",
      "target_count": 1,
      "color": "#22c55e",
      "icon": "💪",
      "is_active": true,
      "streak": {
        "current_streak": 5,
        "longest_streak": 7,
        "last_completed": "2024-01-15"
      }
    }
  ]
}
```

### POST /habits
Создать новую привычку

**Request Body:**
```json
{
  "title": "Медитация",
  "description": "Практика осознанности",
  "frequency": "daily",
  "target_count": 1,
  "color": "#8b5cf6",
  "icon": "🧘"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "title": "Медитация",
    "description": "Практика осознанности",
    "frequency": "daily",
    "target_count": 1,
    "color": "#8b5cf6",
    "icon": "🧘",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /habits/:id
Обновить привычку

**Request Body:**
```json
{
  "title": "Обновленное название",
  "target_count": 2,
  "is_active": false
}
```

### DELETE /habits/:id
Удалить привычку

### POST /habits/:id/log
Отметить выполнение привычки

**Request Body:**
```json
{
  "note": "Отличная тренировка сегодня!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "log": {
      "id": 10,
      "habit_id": 1,
      "completed_at": "2024-01-15T08:30:00.000Z",
      "note": "Отличная тренировка сегодня!",
      "points_earned": 10
    },
    "streak": {
      "current_streak": 6,
      "longest_streak": 7,
      "last_completed": "2024-01-15"
    },
    "achievements": [
      {
        "type": "streak_7",
        "title": "Неделя подряд",
        "points": 25
      }
    ]
  }
}
```

### GET /habits/:id/stats
Получить статистику по привычке

**Query Parameters:**
- `period` - daily, weekly, monthly, yearly (default: monthly)
- `start_date` - начальная дата (ISO format)
- `end_date` - конечная дата (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "habit_id": 1,
    "period": "monthly",
    "total_completions": 28,
    "completion_rate": 93.3,
    "current_streak": 6,
    "longest_streak": 12,
    "calendar": [
      {
        "date": "2024-01-01",
        "completed": true,
        "count": 1
      },
      {
        "date": "2024-01-02",
        "completed": false,
        "count": 0
      }
    ]
  }
}
```

### GET /habits/:id/streak
Получить информацию о стрике

**Response (200):**
```json
{
  "success": true,
  "data": {
    "habit_id": 1,
    "current_streak": 6,
    "longest_streak": 12,
    "last_completed": "2024-01-15"
  }
}
```

---

## 🏆 Достижения

### GET /achievements
Получить все достижения пользователя

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "first_habit",
      "title": "Первая привычка",
      "description": "Создали свою первую привычку",
      "points": 10,
      "icon": "🌟",
      "rarity": "bronze",
      "unlocked_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "type": "streak_7",
      "title": "Неделя подряд",
      "description": "Выполняли привычку 7 дней подряд",
      "points": 25,
      "icon": "🔥",
      "rarity": "silver",
      "unlocked_at": "2024-01-07T00:00:00.000Z"
    }
  ]
}
```

---

## 📈 Статистика пользователя

### GET /user/stats
Получить общую статистику пользователя

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "total_points": 150,
    "level": 3,
    "active_habits": 3,
    "total_habits": 5,
    "completed_tasks": 45,
    "total_tasks": 60,
    "achievements_count": 8,
    "longest_streak": 15,
    "completion_rate": 87.5,
    "weekly_activity": [
      {
        "date": "2024-01-08",
        "completions": 3,
        "points": 30
      },
      {
        "date": "2024-01-09",
        "completions": 2,
        "points": 20
      }
    ]
  }
}
```

---

## ⏰ Напоминания

### GET /reminders
Получить все напоминания пользователя

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "habit_id": 1,
      "habit_title": "Утренняя зарядка",
      "time": "07:00:00",
      "days": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      "enabled": true
    }
  ]
}
```

### POST /reminders
Создать напоминание

**Request Body:**
```json
{
  "habit_id": 1,
  "time": "07:00:00",
  "days": ["mon", "wed", "fri"],
  "enabled": true
}
```

### PUT /reminders/:id
Обновить напоминание

**Request Body:**
```json
{
  "time": "08:00:00",
  "enabled": false
}
```

### DELETE /reminders/:id
Удалить напоминание

---

## 🔌 WebSocket События

### Подключение
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'JWT_TOKEN'
  }
});
```

### Клиент → Сервер

#### 1. join_board
Присоединиться к обновлениям доски
```javascript
socket.emit('join_board', { boardId: 1 });
```

#### 2. leave_board
Отписаться от обновлений доски
```javascript
socket.emit('leave_board', { boardId: 1 });
```

### Сервер → Клиент

#### 1. task_created
Задача создана
```javascript
socket.on('task_created', (data) => {
  console.log('New task:', data);
  // data: { task, columnId, boardId }
});
```

#### 2. task_updated
Задача обновлена
```javascript
socket.on('task_updated', (data) => {
  console.log('Task updated:', data);
  // data: { task, columnId, boardId }
});
```

#### 3. task_deleted
Задача удалена
```javascript
socket.on('task_deleted', (data) => {
  console.log('Task deleted:', data);
  // data: { taskId, columnId, boardId }
});
```

#### 4. task_moved
Задача перемещена
```javascript
socket.on('task_moved', (data) => {
  console.log('Task moved:', data);
  // data: { taskId, oldColumnId, newColumnId, boardId, position }
});
```

#### 5. habit_completed
Привычка выполнена
```javascript
socket.on('habit_completed', (data) => {
  console.log('Habit completed:', data);
  // data: { habitId, log, streak }
});
```

#### 6. streak_updated
Стрик обновлен
```javascript
socket.on('streak_updated', (data) => {
  console.log('Streak updated:', data);
  // data: { habitId, currentStreak, longestStreak, isMilestone }
});
```

#### 7. achievement_unlocked
Достижение разблокировано
```javascript
socket.on('achievement_unlocked', (data) => {
  console.log('Achievement unlocked:', data);
  // data: { achievement: { type, title, points, icon } }
});
```

#### 8. level_up
Повышение уровня
```javascript
socket.on('level_up', (data) => {
  console.log('Level up!', data);
  // data: { newLevel, totalPoints }
});
```

#### 9. reminder_triggered
Напоминание сработало
```javascript
socket.on('reminder_triggered', (data) => {
  console.log('Reminder:', data);
  // data: { habitId, habitTitle, message }
});
```

---

## 📊 Коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request - Неверный формат данных |
| 401 | Unauthorized - Требуется авторизация |
| 403 | Forbidden - Нет доступа к ресурсу |
| 404 | Not Found - Ресурс не найден |
| 409 | Conflict - Конфликт данных (например, duplicate) |
| 500 | Internal Server Error - Ошибка сервера |

## 📝 Примеры ошибок

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid email format",
    "details": "Email must be a valid email address"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": 401,
    "message": "Unauthorized",
    "details": "Invalid or expired token"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": 404,
    "message": "Not Found",
    "details": "Habit with id 999 not found"
  }
}
```