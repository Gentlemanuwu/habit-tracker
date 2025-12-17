-- База данных для "Трекер привычек БАСНИКОВ"
-- PostgreSQL Schema

-- Удаление существующих таблиц (если есть)
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS boards CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    avatar_url VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Таблица досок (канбан)
CREATE TABLE boards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица колонок досок
CREATE TABLE columns (
    id SERIAL PRIMARY KEY,
    board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#e5e7eb',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица задач
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    tags VARCHAR(50)[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Таблица привычек
CREATE TABLE habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, custom
    target_count INTEGER DEFAULT 1, -- сколько раз в день/неделю
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT '✓',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица логов выполнения привычек
CREATE TABLE habit_logs (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    points_earned INTEGER DEFAULT 10
);

-- Таблица стриков (серий выполнения)
CREATE TABLE streaks (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id)
);

-- Таблица достижений
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- streak_7, streak_30, tasks_100, etc.
    title VARCHAR(100) NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    icon VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица напоминаний
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
    time TIME NOT NULL,
    days VARCHAR(3)[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'], -- дни недели
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_boards_user ON boards(user_id);
CREATE INDEX idx_columns_board ON columns(board_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_habits_user ON habits(user_id);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(completed_at);
CREATE INDEX idx_streaks_habit ON streaks(habit_id);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_habit ON reminders(habit_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка тестовых данных
INSERT INTO users (username, email, password_hash, total_points, level) 
VALUES ('basnikov', 'basnikov@example.com', '$2b$10$example_hash', 150, 3);

-- Тестовая доска
INSERT INTO boards (user_id, title, description, color) 
VALUES (1, 'Мои проекты', 'Основная рабочая доска', '#6366f1');

-- Колонки для доски
INSERT INTO columns (board_id, title, position, color) VALUES
(1, 'Не начато', 0, '#ef4444'),
(1, 'В работе', 1, '#f59e0b'),
(1, 'На проверке', 2, '#3b82f6'),
(1, 'Готово', 3, '#22c55e');

-- Тестовые задачи
INSERT INTO tasks (column_id, title, description, position, priority) VALUES
(1, 'Изучить архитектуру приложения', 'Ознакомиться с документацией', 0, 'high'),
(2, 'Настроить базу данных', 'Создать схему PostgreSQL', 0, 'high'),
(2, 'Разработать API', 'Реализовать REST endpoints', 1, 'medium');

-- Тестовые привычки
INSERT INTO habits (user_id, title, description, frequency, target_count, color, icon) VALUES
(1, 'Утренняя зарядка', 'Физические упражнения каждое утро', 'daily', 1, '#22c55e', '💪'),
(1, 'Чтение книг', 'Читать минимум 30 минут', 'daily', 1, '#3b82f6', '📚'),
(1, 'Медитация', 'Практика осознанности', 'daily', 1, '#8b5cf6', '🧘');

-- Инициализация стриков для привычек
INSERT INTO streaks (habit_id, current_streak, longest_streak, last_completed) VALUES
(1, 5, 7, CURRENT_DATE),
(2, 12, 15, CURRENT_DATE),
(3, 3, 8, CURRENT_DATE - INTERVAL '1 day');

-- Тестовые логи выполнения
INSERT INTO habit_logs (habit_id, completed_at, note, points_earned) VALUES
(1, CURRENT_TIMESTAMP - INTERVAL '5 days', 'Отличная тренировка!', 10),
(1, CURRENT_TIMESTAMP - INTERVAL '4 days', NULL, 10),
(1, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL, 10),
(2, CURRENT_TIMESTAMP - INTERVAL '2 days', 'Прочитал 50 страниц', 10),
(2, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, 10);

-- Тестовые достижения
INSERT INTO achievements (user_id, type, title, description, points, icon, rarity) VALUES
(1, 'first_habit', 'Первая привычка', 'Создали свою первую привычку', 10, '🌟', 'bronze'),
(1, 'streak_7', 'Неделя подряд', 'Выполняли привычку 7 дней подряд', 25, '🔥', 'silver'),
(1, 'tasks_10', '10 задач', 'Завершили 10 задач', 15, '✅', 'bronze');

-- Тестовые напоминания
INSERT INTO reminders (user_id, habit_id, time, days, enabled) VALUES
(1, 1, '07:00:00', ARRAY['mon','tue','wed','thu','fri','sat','sun'], true),
(1, 2, '21:00:00', ARRAY['mon','tue','wed','thu','fri','sat','sun'], true),
(1, 3, '09:00:00', ARRAY['mon','wed','fri'], true);