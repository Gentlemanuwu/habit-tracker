# Архитектура приложения "Трекер привычек"

## Общее описание
Полнофункциональная система управления задачами и привычками с real-time обновлениями, мотивационными элементами и продвинутой аналитикой.

## Технологический стек

### Frontend
- **React 18** - основной UI фреймворк
- **React DnD** - drag-and-drop для канбан-досок
- **Recharts** - графики и визуализация прогресса
- **Socket.io Client** - real-time обновления
- **Axios** - HTTP клиент
- **Date-fns** - работа с датами
- **React Router** - навигация

### Backend
- **Node.js 20** - среда выполнения
- **Express** - веб-фреймворк
- **Socket.io** - WebSocket сервер
- **pg (node-postgres)** - PostgreSQL клиент
- **bcrypt** - хеширование паролей
- **jsonwebtoken** - JWT аутентификация
- **node-cron** - планировщик задач для напоминаний

### База данных
- **PostgreSQL** - основная БД

## Архитектура системы

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Kanban  │ │ Calendar │ │ Progress │ │  Rewards │  │
│  │  Board   │ │   View   │ │  Charts  │ │  System  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                   │                │                     │
│              ┌────┴────────────────┴────┐               │
│              │   WebSocket Client       │               │
│              └──────────┬───────────────┘               │
└─────────────────────────┼───────────────────────────────┘
                          │
                    HTTP/WS Protocol
                          │
┌─────────────────────────┼───────────────────────────────┐
│              ┌──────────┴───────────────┐               │
│              │   Express + Socket.io    │               │
│              └──────────┬───────────────┘               │
│                         │                                │
│  ┌──────────┐ ┌────────┴──────┐ ┌──────────┐           │
│  │  Task    │ │    Habit      │ │  Reward  │           │
│  │  API     │ │    API        │ │  System  │           │
│  └────┬─────┘ └────────┬──────┘ └────┬─────┘           │
│       │                 │              │                 │
│       └────────┬────────┴──────────────┘                │
│                │                                         │
│         ┌──────┴──────┐                                 │
│         │  PostgreSQL │                                 │
│         │   Database  │                                 │
│         └─────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

## Структура базы данных

### Таблицы

#### users
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- created_at (TIMESTAMP)
- total_points (INTEGER)
- level (INTEGER)

#### boards
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users)
- title (VARCHAR)
- description (TEXT)
- created_at (TIMESTAMP)

#### columns
- id (SERIAL PRIMARY KEY)
- board_id (INTEGER REFERENCES boards)
- title (VARCHAR)
- position (INTEGER)

#### tasks
- id (SERIAL PRIMARY KEY)
- column_id (INTEGER REFERENCES columns)
- title (VARCHAR)
- description (TEXT)
- position (INTEGER)
- priority (VARCHAR)
- due_date (DATE)
- completed (BOOLEAN)
- created_at (TIMESTAMP)

#### habits
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users)
- title (VARCHAR)
- description (TEXT)
- frequency (VARCHAR) - daily, weekly, custom
- target_count (INTEGER)
- color (VARCHAR)
- icon (VARCHAR)
- created_at (TIMESTAMP)

#### habit_logs
- id (SERIAL PRIMARY KEY)
- habit_id (INTEGER REFERENCES habits)
- completed_at (TIMESTAMP)
- note (TEXT)

#### streaks
- id (SERIAL PRIMARY KEY)
- habit_id (INTEGER REFERENCES habits)
- current_streak (INTEGER)
- longest_streak (INTEGER)
- last_completed (DATE)

#### achievements
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users)
- type (VARCHAR)
- title (VARCHAR)
- description (TEXT)
- points (INTEGER)
- unlocked_at (TIMESTAMP)

#### reminders
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER REFERENCES users)
- habit_id (INTEGER REFERENCES habits)
- time (TIME)
- days (VARCHAR[]) - дни недели
- enabled (BOOLEAN)

## API Endpoints

### Аутентификация
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Доски и задачи
- GET /api/boards - получить все доски
- POST /api/boards - создать доску
- PUT /api/boards/:id - обновить доску
- DELETE /api/boards/:id - удалить доску
- GET /api/boards/:id/columns - получить колонки
- POST /api/columns - создать колонку
- PUT /api/columns/:id - обновить колонку
- POST /api/tasks - создать задачу
- PUT /api/tasks/:id - обновить задачу
- DELETE /api/tasks/:id - удалить задачу
- PUT /api/tasks/:id/move - переместить задачу

### Привычки
- GET /api/habits - получить все привычки
- POST /api/habits - создать привычку
- PUT /api/habits/:id - обновить привычку
- DELETE /api/habits/:id - удалить привычку
- POST /api/habits/:id/log - отметить выполнение
- GET /api/habits/:id/stats - получить статистику
- GET /api/habits/:id/streak - получить стрик

### Достижения и награды
- GET /api/achievements - получить достижения
- GET /api/user/stats - получить статистику пользователя

### Напоминания
- GET /api/reminders - получить напоминания
- POST /api/reminders - создать напоминание
- PUT /api/reminders/:id - обновить напоминание
- DELETE /api/reminders/:id - удалить напоминание

## WebSocket события

### Отправляемые клиентом
- `join_board` - присоединиться к доске
- `task_update` - обновление задачи
- `habit_complete` - выполнение привычки

### Отправляемые сервером
- `task_created` - задача создана
- `task_updated` - задача обновлена
- `task_deleted` - задача удалена
- `task_moved` - задача перемещена
- `habit_completed` - привычка выполнена
- `streak_updated` - стрик обновлен
- `achievement_unlocked` - достижение разблокировано
- `reminder_triggered` - напоминание сработало

## Ключевые функции

### 1. Канбан-доски
- Создание множества досок
- Drag & Drop задач между колонками
- Приоритеты и дедлайны
- Real-time синхронизация

### 2. Трекер привычек
- Ежедневные/еженедельные привычки
- Календарь выполнения
- Стрики и рекорды
- Гибкая настройка частоты

### 3. Мотивационная система
- Система очков и уровней
- Достижения за различные активности
- Стрики (серии выполнений)
- Награды и бейджи

### 4. Аналитика
- Графики прогресса по привычкам
- Статистика выполнения задач
- Тепловые карты активности
- Сравнение периодов

### 5. Напоминания
- Персональные напоминания для привычек
- Выбор времени и дней недели
- Push-уведомления в браузере

## Система достижений

### Типы достижений
1. **Стрики**: 7, 30, 100, 365 дней подряд
2. **Количество**: 10, 50, 100, 500 выполнений
3. **Задачи**: 10, 50, 100 завершенных задач
4. **Первые шаги**: первая привычка, первая доска
5. **Идеальная неделя**: все привычки выполнены 7 дней подряд

### Награды
- Бронзовые (10 очков)
- Серебряные (25 очков)
- Золотые (50 очков)
- Платиновые (100 очков)

## Цветовая схема
- Основной: #6366f1 (индиго)
- Успех: #22c55e (зеленый)
- Предупреждение: #f59e0b (оранжевый)
- Опасность: #ef4444 (красный)
- Фон: #f9fafb (светло-серый)
- Текст: #1f2937 (темно-серый)