const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');
const config = require('../config/config');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// GET /api/user/stats - Получить общую статистику пользователя
router.get('/stats', asyncHandler(async (req, res) => {
  // Получаем базовую информацию о пользователе
  const userResult = await query(
    'SELECT id, username, email, total_points, level, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  const user = userResult.rows[0];

  // Статистика по привычкам
  const habitsStats = await query(
    `SELECT 
       COUNT(*) as total_habits,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_habits,
       COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_habits
     FROM habits 
     WHERE user_id = $1`,
    [req.user.id]
  );

  // Статистика по задачам
  const tasksStats = await query(
    `SELECT 
       COUNT(*) as total_tasks,
       COUNT(CASE WHEN completed = true THEN 1 END) as completed_tasks,
       COUNT(CASE WHEN completed = false THEN 1 END) as pending_tasks
     FROM tasks t
     JOIN columns c ON t.column_id = c.id
     JOIN boards b ON c.board_id = b.id
     WHERE b.user_id = $1`,
    [req.user.id]
  );

  // Количество достижений
  const achievementsCount = await query(
    'SELECT COUNT(*) as count FROM achievements WHERE user_id = $1',
    [req.user.id]
  );

  // Самый длинный стрик
  const longestStreak = await query(
    `SELECT MAX(longest_streak) as max_streak 
     FROM streaks s
     JOIN habits h ON s.habit_id = h.id
     WHERE h.user_id = $1`,
    [req.user.id]
  );

  // Текущие активные стрики
  const activeStreaks = await query(
    `SELECT COUNT(*) as count 
     FROM streaks s
     JOIN habits h ON s.habit_id = h.id
     WHERE h.user_id = $1 AND s.current_streak > 0`,
    [req.user.id]
  );

  // Процент завершения задач
  const totalTasks = parseInt(tasksStats.rows[0].total_tasks);
  const completedTasks = parseInt(tasksStats.rows[0].completed_tasks);
  const taskCompletionRate = totalTasks > 0 
   ? Math.round((completedTasks / totalTasks) * 100) 
   : 0;

  // Активность за последние 7 дней
  const weeklyActivity = await query(
    `SELECT DATE(completed_at) as date, COUNT(*) as completions
     FROM habit_logs
     WHERE habit_id IN (SELECT id FROM habits WHERE user_id = $1)
     AND completed_at >= CURRENT_DATE - INTERVAL '6 days'
     GROUP BY DATE(completed_at)
     ORDER BY DATE(completed_at)`,
    [req.user.id]
  );

  // Формируем календарь активности за неделю
  const weeklyCalendar = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const activity = weeklyActivity.rows.find(
      a => a.date.toISOString().split('T')[0] === dateStr
    );
    
    weeklyCalendar.push({
      date: dateStr,
      completions: activity? parseInt(activity.completions): 0,
      points: activity? parseInt(activity.completions) * config.points.habitCompletion: 0,
    });
  }

  res.json({
    success: true,
    data: {
      user_id: user.id,
      username: user.username,
      email: user.email,
      total_points: user.total_points,
      level: user.level,
      member_since: user.created_at,
      
      habits: {
        total: parseInt(habitsStats.rows[0].total_habits),
        active: parseInt(habitsStats.rows[0].active_habits),
        inactive: parseInt(habitsStats.rows[0].inactive_habits),
      },
      
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: parseInt(tasksStats.rows[0].pending_tasks),
        completion_rate: taskCompletionRate,
      },
      
      achievements: {
        total: parseInt(achievementsCount.rows[0].count),
      },
      
      streaks: {
        longest: parseInt(longestStreak.rows[0].max_streak) || 0,
        active_count: parseInt(activeStreaks.rows[0].count),
      },
      
      weekly_activity: weeklyCalendar,
    },
  });
}));

// GET /api/user/profile - Получить профиль пользователя
router.get('/profile', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, username, email, total_points, level, avatar_url, timezone, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// PUT /api/user/profile - Обновить профиль пользователя
router.put('/profile', asyncHandler(async (req, res) => {
  const { username, avatar_url, timezone } = req.body;

  // Формируем динамический запрос для обновления
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (username!== undefined) {
    // Проверяем уникальность username
    if (username) {
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1 AND id!= $2',
        [username, req.user.id]
      );

      if (existingUser.rows.length > 0) {
        throw new ValidationError('Username already taken');
      }
    }
    
    updates.push(`username = $${paramCount++}`);
    values.push(username);
  }

  if (avatar_url!== undefined) {
    updates.push(`avatar_url = $${paramCount++}`);
    values.push(avatar_url);
  }

  if (timezone!== undefined) {
    updates.push(`timezone = $${paramCount++}`);
    values.push(timezone);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  values.push(req.user.id);
  const result = await query(
    `UPDATE users 
     SET ${updates.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING id, username, email, total_points, level, avatar_url, timezone, created_at`,
    values
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// GET /api/user/leaderboard - Получить топ пользователей по очкам
router.get('/leaderboard', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const result = await query(
    `SELECT id, username, total_points, level 
     FROM users 
     ORDER BY total_points DESC 
     LIMIT $1`,
    [limit]
  );

  // Находим позицию текущего пользователя
  const userRank = await query(
    `SELECT COUNT(*) + 1 as rank 
     FROM users 
     WHERE total_points > (SELECT total_points FROM users WHERE id = $1)`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      leaderboard: result.rows,
      current_user_rank: parseInt(userRank.rows[0].rank),
    },
  });
}));

module.exports = router;