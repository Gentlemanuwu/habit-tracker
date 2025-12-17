const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// GET /api/reminders - Получить все напоминания пользователя
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT r.id, r.habit_id, h.title as habit_title, r.time, r.days, r.enabled, r.created_at 
     FROM reminders r 
     JOIN habits h ON r.habit_id = h.id 
     WHERE r.user_id = $1 
     ORDER BY r.time`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows,
  });
}));

// GET /api/reminders/:id - Получить одно напоминание
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT r.id, r.habit_id, h.title as habit_title, r.time, r.days, r.enabled, r.created_at 
     FROM reminders r 
     JOIN habits h ON r.habit_id = h.id 
     WHERE r.id = $1 AND r.user_id = $2`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Reminder not found');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// POST /api/reminders - Создать напоминание
router.post('/', asyncHandler(async (req, res) => {
  const { 
    habit_id, 
    time, 
    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    enabled = true 
  } = req.body;

  if (!habit_id ||!time) {
    throw new ValidationError('Habit ID and time are required');
  }

  // Проверяем, что привычка принадлежит пользователю
  const habitCheck = await query(
    'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
    [habit_id, req.user.id]
  );

  if (habitCheck.rows.length === 0) {
    throw new NotFoundError('Habit not found');
  }

  // Валидация формата времени (HH:MM:SS)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    throw new ValidationError('Invalid time format. Use HH:MM:SS');
  }

  // Валидация дней недели
  const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const invalidDays = days.filter(d =>!validDays.includes(d));
  
  if (invalidDays.length > 0) {
    throw new ValidationError(`Invalid days: ${invalidDays.join(', ')}. Valid days: ${validDays.join(', ')}`);
  }

  const result = await query(
    `INSERT INTO reminders (user_id, habit_id, time, days, enabled) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING id, habit_id, time, days, enabled, created_at`,
    [req.user.id, habit_id, time, days, enabled]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
}));

// PUT /api/reminders/:id - Обновить напоминание
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { time, days, enabled } = req.body;

  // Проверяем, что напоминание принадлежит пользователю
  const reminderCheck = await query(
    'SELECT id FROM reminders WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (reminderCheck.rows.length === 0) {
    throw new NotFoundError('Reminder not found');
  }

  // Формируем динамический запрос для обновления
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (time!== undefined) {
    // Валидация формата времени
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      throw new ValidationError('Invalid time format. Use HH:MM:SS');
    }
    updates.push(`time = $${paramCount++}`);
    values.push(time);
  }

  if (days!== undefined) {
    // Валидация дней недели
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const invalidDays = days.filter(d =>!validDays.includes(d));
    
    if (invalidDays.length > 0) {
      throw new ValidationError(`Invalid days: ${invalidDays.join(', ')}`);
    }
    updates.push(`days = $${paramCount++}`);
    values.push(days);
  }

  if (enabled!== undefined) {
    updates.push(`enabled = $${paramCount++}`);
    values.push(enabled);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE reminders 
     SET ${updates.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING id, habit_id, time, days, enabled, created_at`,
    values
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// DELETE /api/reminders/:id - Удалить напоминание
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Reminder not found');
  }

  res.json({
    success: true,
    message: 'Reminder deleted successfully',
  });
}));

module.exports = router;