const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// POST /api/tasks - Создать новую задачу
router.post('/', asyncHandler(async (req, res) => {
  const { 
    column_id, 
    title, 
    description, 
    position, 
    priority = 'medium',
    due_date,
    tags = []
  } = req.body;

  if (!column_id ||!title) {
    throw new ValidationError('Column ID and title are required');
  }

  // Проверяем, что колонка принадлежит доске пользователя
  const columnCheck = await query(
    `SELECT c.id FROM columns c 
     JOIN boards b ON c.board_id = b.id 
     WHERE c.id = $1 AND b.user_id = $2`,
    [column_id, req.user.id]
  );

  if (columnCheck.rows.length === 0) {
    throw new NotFoundError('Column not found');
  }

  // Если позиция не указана, добавляем в конец
  let finalPosition = position;
  if (finalPosition === undefined) {
    const maxPosResult = await query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE column_id = $1',
      [column_id]
    );
    finalPosition = maxPosResult.rows[0].max_pos + 1;
  }

  const result = await query(
    `INSERT INTO tasks (column_id, title, description, position, priority, due_date, tags) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING id, column_id, title, description, position, priority, 
               due_date, completed, tags, created_at, updated_at`,
    [column_id, title, description, finalPosition, priority, due_date, tags]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
}));

// GET /api/tasks/:id - Получить одну задачу
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT t.* FROM tasks t 
     JOIN columns c ON t.column_id = c.id 
     JOIN boards b ON c.board_id = b.id 
     WHERE t.id = $1 AND b.user_id = $2`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Task not found');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// PUT /api/tasks/:id - Обновить задачу
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, due_date, completed, tags } = req.body;

  // Проверяем, что задача принадлежит доске пользователя
  const taskCheck = await query(
    `SELECT t.id FROM tasks t 
     JOIN columns c ON t.column_id = c.id 
     JOIN boards b ON c.board_id = b.id 
     WHERE t.id = $1 AND b.user_id = $2`,
    [id, req.user.id]
  );

  if (taskCheck.rows.length === 0) {
    throw new NotFoundError('Task not found');
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
  if (priority!== undefined) {
    updates.push(`priority = $${paramCount++}`);
    values.push(priority);
  }
  if (due_date!== undefined) {
    updates.push(`due_date = $${paramCount++}`);
    values.push(due_date);
  }
  if (completed!== undefined) {
    updates.push(`completed = $${paramCount++}`);
    values.push(completed);
    
    // Если задача помечена как завершенная, устанавливаем время завершения
    if (completed) {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else {
      updates.push(`completed_at = NULL`);
    }
  }
  if (tags!== undefined) {
    updates.push(`tags = $${paramCount++}`);
    values.push(tags);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE tasks 
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount} 
     RETURNING id, column_id, title, description, position, priority, 
               due_date, completed, tags, created_at, updated_at, completed_at`,
    values
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// DELETE /api/tasks/:id - Удалить задачу
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `DELETE FROM tasks 
     WHERE id = $1 AND column_id IN (
       SELECT c.id FROM columns c 
       JOIN boards b ON c.board_id = b.id 
       WHERE b.user_id = $2
     ) 
     RETURNING id`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Task not found');
  }

  res.json({
    success: true,
    message: 'Task deleted successfully',
  });
}));

// PUT /api/tasks/:id/move - Переместить задачу в другую колонку
router.put('/:id/move', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { column_id, position } = req.body;

  if (!column_id) {
    throw new ValidationError('Column ID is required');
  }

  // Проверяем, что задача и колонка принадлежат доскам пользователя
  const taskCheck = await query(
    `SELECT t.id, t.column_id as old_column_id FROM tasks t 
     JOIN columns c ON t.column_id = c.id 
     JOIN boards b ON c.board_id = b.id 
     WHERE t.id = $1 AND b.user_id = $2`,
    [id, req.user.id]
  );

  if (taskCheck.rows.length === 0) {
    throw new NotFoundError('Task not found');
  }

  const columnCheck = await query(
    `SELECT c.id FROM columns c 
     JOIN boards b ON c.board_id = b.id 
     WHERE c.id = $1 AND b.user_id = $2`,
    [column_id, req.user.id]
  );

  if (columnCheck.rows.length === 0) {
    throw new NotFoundError('Target column not found');
  }

  // Если позиция не указана, добавляем в конец новой колонки
  let finalPosition = position;
  if (finalPosition === undefined) {
    const maxPosResult = await query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM tasks WHERE column_id = $1',
      [column_id]
    );
    finalPosition = maxPosResult.rows[0].max_pos + 1;
  }

  // Перемещаем задачу
  const result = await query(
    `UPDATE tasks 
     SET column_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $3 
     RETURNING id, column_id, title, position, updated_at`,
    [column_id, finalPosition, id]
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

module.exports = router;