const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');
const config = require('../config/config');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// GET /api/habits - Получить все привычки пользователя
router.get('/', asyncHandler(async (req, res) => {
  const habitsResult = await query(
    `SELECT id, title, description, frequency, target_count, color, icon, is_active, created_at, updated_at 
     FROM habits 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  // Получаем стрики для каждой привычки
  const habits = await Promise.all(
    habitsResult.rows.map(async (habit) => {
      const streakResult = await query(
        'SELECT current_streak, longest_streak, last_completed FROM streaks WHERE habit_id = $1',
        [habit.id]
      );

      return {
       ...habit,
        streak: streakResult.rows[0] || {
          current_streak: 0,
          longest_streak: 0,
          last_completed: null,
        },
      };
    })
  );

  res.json({
    success: true,
    data: habits,
  });
}));

// GET /api/habits/:id - Получить одну привычку
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const habitResult = await query(
    'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (habitResult.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  const streakResult = await query(
    'SELECT current_streak, longest_streak, last_completed FROM streaks WHERE habit_id = $1',
    [id]
  );

  const habit = {
   ...habitResult.rows[0],
    streak: streakResult.rows[0] || { current_streak: 0, longest_streak: 0, last_completed: null },
  };

  res.json({
    success: true,
    data: habit,
  });
}));

// POST /api/habits - Создать новую привычку
router.post('/', asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    frequency = 'daily', 
    target_count = 1, 
    color = '#6366f1', 
    icon = '✓' 
  } = req.body;

  if (!title) {
    throw new ValidationError('Title is required');
  }

  // Используем транзакцию для создания привычки и стрика
  const result = await transaction(async (client) => {
    // Создаем привычку
    const habitResult = await client.query(
      `INSERT INTO habits (user_id, title, description, frequency, target_count, color, icon) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, title, description, frequency, target_count, color, icon, is_active, created_at, updated_at`,
      [req.user.id, title, description, frequency, target_count, color, icon]
    );

    const habit = habitResult.rows[0];

    // Создаем запись стрика
    await client.query(
      'INSERT INTO streaks (habit_id, current_streak, longest_streak) VALUES ($1, 0, 0)',
      [habit.id]
    );

    return habit;
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}));

// PUT /api/habits/:id - Обновить привычку
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, frequency, target_count, color, icon, is_active } = req.body;

  // Проверяем, что привычка принадлежит пользователю
  const habitCheck = await query(
    'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (habitCheck.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  // Формируем динамический запрос для обновления
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title!== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (description!== undefined) {
    updates.push(`description = $${paramCount++}`);
    values.push(description);
  }
  if (frequency!== undefined) {
    updates.push(`frequency = $${paramCount++}`);
    values.push(frequency);
  }
  if (target_count!== undefined) {
    updates.push(`target_count = $${paramCount++}`);
    values.push(target_count);
  }
  if (color!== undefined) {
    updates.push(`color = $${paramCount++}`);
    values.push(color);
  }
  if (icon!== undefined) {
    updates.push(`icon = $${paramCount++}`);
    values.push(icon);
  }
  if (is_active!== undefined) {
    updates.push(`is_active = $${paramCount++}`);
    values.push(is_active);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE habits 
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount} 
     RETURNING id, title, description, frequency, target_count, color, icon, is_active, created_at, updated_at`,
    values
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// DELETE /api/habits/:id - Удалить привычку
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  res.json({
    success: true,
    message: 'Habit deleted successfully',
  });
}));

// POST /api/habits/:id/log - Отметить выполнение привычки
router.post('/:id/log', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  // Проверяем, что привычка принадлежит пользователю
  const habitCheck = await query(
    'SELECT id FROM habits WHERE id = $1 AND user_id = $2 AND is_active = true',
    [id, req.user.id]
  );

  if (habitCheck.rows.length === 0) {
    throw new NotFoundError('Active habit not found');
  }

  // Используем транзакцию для логирования и обновления стрика
  const result = await transaction(async (client) => {
    // Создаем лог выполнения
    const points = config.points.habitCompletion;
    const logResult = await client.query(
      `INSERT INTO habit_logs (habit_id, note, points_earned) 
       VALUES ($1, $2, $3) 
       RETURNING id, habit_id, completed_at, note, points_earned`,
      [id, note, points]
    );

    const log = logResult.rows[0];

    // Обновляем стрик
    const streakResult = await client.query(
      `SELECT current_streak, longest_streak, last_completed 
       FROM streaks 
       WHERE habit_id = $1`,
      [id]
    );

    let streak = streakResult.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const lastCompleted = streak.last_completed 
     ? new Date(streak.last_completed).toISOString().split('T')[0]
     : null;

    let newCurrentStreak = streak.current_streak;
    let newLongestStreak = streak.longest_streak;

    // Проверяем, была ли привычка выполнена вчера
    if (lastCompleted) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastCompleted === yesterdayStr) {
        // Продолжаем стрик
        newCurrentStreak += 1;
      } else if (lastCompleted!== today) {
        // Стрик прервался
        newCurrentStreak = 1;
      }
      // Если lastCompleted === today, не увеличиваем стрик (уже выполнено сегодня)
    } else {
      // Первое выполнение
      newCurrentStreak = 1;
    }

    // Обновляем самый длинный стрик
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    await client.query(
      `UPDATE streaks 
       SET current_streak = $1, longest_streak = $2, last_completed = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP 
       WHERE habit_id = $3`,
      [newCurrentStreak, newLongestStreak, id]
    );

    // Обновляем очки пользователя
    await client.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [points, req.user.id]
    );

    // Проверяем достижения
    const achievements = [];
    
    // Проверка достижений по стрикам
    const streakAchievements = [
      { type: 'streak_7', threshold: 7 },
      { type: 'streak_30', threshold: 30 },
      { type: 'streak_100', threshold: 100 },
      { type: 'streak_365', threshold: 365 },
    ];

    for (const achievement of streakAchievements) {
      if (newCurrentStreak >= achievement.threshold) {
        // Проверяем, не получено ли достижение ранее
        const existingAchievement = await client.query(
          'SELECT id FROM achievements WHERE user_id = $1 AND type = $2',
          [req.user.id, achievement.type]
        );

        if (existingAchievement.rows.length === 0) {
          const achConfig = config.achievements.types[achievement.type];
          await client.query(
            `INSERT INTO achievements (user_id, type, title, description, points, icon, rarity) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user.id,
              achievement.type,
              `${achievement.threshold} дней подряд`,
              `Выполняли привычку ${achievement.threshold} дней подряд`,
              achConfig.points,
              achConfig.icon,
              achConfig.rarity,
            ]
          );

          achievements.push({
            type: achievement.type,
            title: `${achievement.threshold} дней подряд`,
            points: achConfig.points,
          });

          // Добавляем очки за достижение
          await client.query(
            'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
            [achConfig.points, req.user.id]
          );
        }
      }
    }

    return {
      log,
      streak: {
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_completed: today,
      },
      achievements,
    };
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}));

// GET /api/habits/:id/stats - Получить статистику по привычке
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = 'monthly', start_date, end_date } = req.query;

  // Проверяем, что привычка принадлежит пользователю
  const habitCheck = await query(
    'SELECT id, title FROM habits WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (habitCheck.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  // Определяем период для статистики
  let dateFilter = '';
  const params = [id];

  if (start_date && end_date) {
    dateFilter = 'AND completed_at BETWEEN $2 AND $3';
    params.push(start_date, end_date);
  } else {
    // Дефолтные периоды
    const periods = {
      daily: '1 day',
      weekly: '7 days',
      monthly: '30 days',
      yearly: '365 days',
    };
    
    if (periods[period]) {
      dateFilter = `AND completed_at >= CURRENT_DATE - INTERVAL '${periods[period]}'`;
    }
  }

  // Общее количество выполнений
  const totalResult = await query(
    `SELECT COUNT(*) as total 
     FROM habit_logs 
     WHERE habit_id = $1 ${dateFilter}`,
    params
  );

  // Получаем календарь выполнений (последние 90 дней)
  const calendarResult = await query(
    `SELECT DATE(completed_at) as date, COUNT(*) as count 
     FROM habit_logs 
     WHERE habit_id = $1 
     AND completed_at >= CURRENT_DATE - INTERVAL '90 days'
     GROUP BY DATE(completed_at) 
     ORDER BY DATE(completed_at)`,
    [id]
  );

  // Формируем календарь за последние 90 дней
  const calendar = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const logEntry = calendarResult.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
    
    calendar.push({
      date: dateStr,
      completed: logEntry? true: false,
      count: logEntry? parseInt(logEntry.count): 0,
    });
  }

  // Получаем текущий стрик
  const streakResult = await query(
    'SELECT current_streak, longest_streak FROM streaks WHERE habit_id = $1',
    [id]
  );

  // Рассчитываем процент выполнения
  const totalDays = calendar.length;
  const completedDays = calendar.filter(c => c.completed).length;
  const completionRate = totalDays > 0? (completedDays / totalDays) * 100: 0;

  res.json({
    success: true,
    data: {
      habit_id: parseInt(id),
      habit_title: habitCheck.rows[0].title,
      period,
      total_completions: parseInt(totalResult.rows[0].total),
      completion_rate: Math.round(completionRate * 10) / 10,
      current_streak: streakResult.rows[0]?.current_streak || 0,
      longest_streak: streakResult.rows[0]?.longest_streak || 0,
      calendar,
    },
  });
}));

// GET /api/habits/:id/streak - Получить информацию о стрике
router.get('/:id/streak', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Проверяем, что привычка принадлежит пользователю
  const habitCheck = await query(
    'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (habitCheck.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  const result = await query(
    'SELECT habit_id, current_streak, longest_streak, last_completed FROM streaks WHERE habit_id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    // Если стрика нет, создаем его
    await query(
      'INSERT INTO streaks (habit_id, current_streak, longest_streak) VALUES ($1, 0, 0)',
      [id]
    );

    return res.json({
      success: true,
      data: {
        habit_id: parseInt(id),
        current_streak: 0,
        longest_streak: 0,
        last_completed: null,
      },
    });
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

module.exports = router;