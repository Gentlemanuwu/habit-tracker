const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// GET /api/achievements - Получить все достижения пользователя
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, type, title, description, points, icon, rarity, unlocked_at 
     FROM achievements 
     WHERE user_id = $1 
     ORDER BY unlocked_at DESC`,
    [req.user.id]
  );

  // Группируем по типу редкости
  const groupedByRarity = {
    bronze: [],
    silver: [],
    gold: [],
    platinum: [],
  };

  result.rows.forEach(achievement => {
    if (groupedByRarity[achievement.rarity]) {
      groupedByRarity[achievement.rarity].push(achievement);
    }
  });

  res.json({
    success: true,
    data: {
      all: result.rows,
      total: result.rows.length,
      by_rarity: groupedByRarity,
      total_points: result.rows.reduce((sum, a) => sum + a.points, 0),
    },
  });
}));

// GET /api/achievements/available - Получить доступные (еще не полученные) достижения
router.get('/available', asyncHandler(async (req, res) => {
  const config = require('../config/config');
  
  // Получаем уже полученные достижения
  const unlocked = await query(
    'SELECT type FROM achievements WHERE user_id = $1',
    [req.user.id]
  );

  const unlockedTypes = new Set(unlocked.rows.map(a => a.type));

  // Фильтруем доступные достижения
  const available = Object.entries(config.achievements.types)
   .filter(([type]) =>!unlockedTypes.has(type))
   .map(([type, data]) => ({
      type,
      title: getAchievementTitle(type),
      description: getAchievementDescription(type),
      points: data.points,
      icon: data.icon,
      rarity: data.rarity,
      requirement: getAchievementRequirement(type),
    }));

  res.json({
    success: true,
    data: available,
  });
}));

// GET /api/achievements/stats - Статистика по достижениям
router.get('/stats', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
       COUNT(*) as total_unlocked,
       SUM(points) as total_points,
       COUNT(CASE WHEN rarity = 'bronze' THEN 1 END) as bronze_count,
       COUNT(CASE WHEN rarity = 'silver' THEN 1 END) as silver_count,
       COUNT(CASE WHEN rarity = 'gold' THEN 1 END) as gold_count,
       COUNT(CASE WHEN rarity = 'platinum' THEN 1 END) as platinum_count
     FROM achievements 
     WHERE user_id = $1`,
    [req.user.id]
  );

  const stats = result.rows[0];
  const config = require('../config/config');
  const totalAchievements = Object.keys(config.achievements.types).length;

  res.json({
    success: true,
    data: {
      total_unlocked: parseInt(stats.total_unlocked),
      total_available: totalAchievements,
      completion_percentage: totalAchievements > 0 
       ? Math.round((parseInt(stats.total_unlocked) / totalAchievements) * 100) 
       : 0,
      total_points: parseInt(stats.total_points) || 0,
      by_rarity: {
        bronze: parseInt(stats.bronze_count) || 0,
        silver: parseInt(stats.silver_count) || 0,
        gold: parseInt(stats.gold_count) || 0,
        platinum: parseInt(stats.platinum_count) || 0,
      },
    },
  });
}));

// GET /api/achievements/recent - Получить последние разблокированные достижения
router.get('/recent', asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  const result = await query(
    `SELECT id, type, title, description, points, icon, rarity, unlocked_at 
     FROM achievements 
     WHERE user_id = $1 
     ORDER BY unlocked_at DESC 
     LIMIT $2`,
    [req.user.id, limit]
  );

  res.json({
    success: true,
    data: result.rows,
  });
}));

// Вспомогательные функции для генерации информации о достижениях
function getAchievementTitle(type) {
  const titles = {
    first_habit: 'Первая привычка',
    first_task: 'Первая задача',
    streak_7: 'Неделя подряд',
    streak_30: '30 дней подряд',
    streak_100: '100 дней подряд',
    streak_365: 'Год подряд',
    habits_10: '10 привычек',
    habits_50: '50 привычек',
    habits_100: '100 привычек',
    tasks_10: '10 задач',
    tasks_50: '50 задач',
    tasks_100: '100 задач',
    perfect_week: 'Идеальная неделя',
  };
  return titles[type] || type;
}

function getAchievementDescription(type) {
  const descriptions = {
    first_habit: 'Создали свою первую привычку',
    first_task: 'Создали свою первую задачу',
    streak_7: 'Выполняли привычку 7 дней подряд',
    streak_30: 'Выполняли привычку 30 дней подряд',
    streak_100: 'Выполняли привычку 100 дней подряд',
    streak_365: 'Выполняли привычку 365 дней подряд',
    habits_10: 'Выполнили привычки 10 раз',
    habits_50: 'Выполнили привычки 50 раз',
    habits_100: 'Выполнили привычки 100 раз',
    tasks_10: 'Завершили 10 задач',
    tasks_50: 'Завершили 50 задач',
    tasks_100: 'Завершили 100 задач',
    perfect_week: 'Выполнили все привычки 7 дней подряд',
  };
  return descriptions[type] || 'Секретное достижение';
}

function getAchievementRequirement(type) {
  const requirements = {
    first_habit: 'Создайте первую привычку',
    first_task: 'Создайте первую задачу',
    streak_7: 'Выполняйте привычку 7 дней подряд',
    streak_30: 'Выполняйте привычку 30 дней подряд',
    streak_100: 'Выполняйте привычку 100 дней подряд',
    streak_365: 'Выполняйте привычку 365 дней подряд',
    habits_10: 'Выполните привычки 10 раз',
    habits_50: 'Выполните привычки 50 раз',
    habits_100: 'Выполните привычки 100 раз',
    tasks_10: 'Завершите 10 задач',
    tasks_50: 'Завершите 50 задач',
    tasks_100: 'Завершите 100 задач',
    perfect_week: 'Выполните все привычки 7 дней подряд',
  };
  return requirements[type] || 'Секретное требование';
}

module.exports = router;