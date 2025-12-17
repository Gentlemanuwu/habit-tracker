const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// GET /api/boards - Получить все доски пользователя
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, title, description, color, created_at, updated_at 
     FROM boards 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows,
  });
}));

// GET /api/boards/:id - Получить одну доску
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT id, title, description, color, created_at, updated_at 
     FROM boards 
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Board not found');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// POST /api/boards - Создать новую доску
router.post('/', asyncHandler(async (req, res) => {
  const { title, description, color = '#6366f1' } = req.body;

  if (!title) {
    throw new ValidationError('Title is required');
  }

  const result = await query(
    `INSERT INTO boards (user_id, title, description, color) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, title, description, color, created_at, updated_at`,
    [req.user.id, title, description, color]
  );

  // Создаем дефолтные колонки для новой доски
  const boardId = result.rows[0].id;
  const defaultColumns = [
    { title: 'Не начато', position: 0, color: '#ef4444' },
    { title: 'В работе', position: 1, color: '#f59e0b' },
    { title: 'На проверке', position: 2, color: '#3b82f6' },
    { title: 'Готово', position: 3, color: '#22c55e' },
  ];

  for (const column of defaultColumns) {
    await query(
      'INSERT INTO columns (board_id, title, position, color) VALUES ($1, $2, $3, $4)',
      [boardId, column.title, column.position, column.color]
    );
  }

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
}));

// PUT /api/boards/:id - Обновить доску
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, color } = req.body;

  // Проверяем, что доска принадлежит пользователю
  const boardCheck = await query(
    'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (boardCheck.rows.length === 0) {
    throw new NotFoundError('Board not found');
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
  if (color!== undefined) {
    updates.push(`color = $${paramCount++}`);
    values.push(color);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  values.push(id);
  const result = await query(
    `UPDATE boards 
     SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount} 
     RETURNING id, title, description, color, created_at, updated_at`,
    values
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// DELETE /api/boards/:id - Удалить доску
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM boards WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Board not found');
  }

  res.json({
    success: true,
    message: 'Board deleted successfully',
  });
}));

// GET /api/boards/:id/columns - Получить все колонки доски с задачами
router.get('/:id/columns', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Проверяем, что доска принадлежит пользователю
  const boardCheck = await query(
    'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  if (boardCheck.rows.length === 0) {
    throw new NotFoundError('Board not found');
  }

  // Получаем колонки
  const columnsResult = await query(
    `SELECT id, board_id, title, position, color, created_at 
     FROM columns 
     WHERE board_id = $1 
     ORDER BY position`,
    [id]
  );

  // Получаем задачи для каждой колонки
  const columns = await Promise.all(
    columnsResult.rows.map(async (column) => {
      const tasksResult = await query(
        `SELECT id, column_id, title, description, position, priority, 
                due_date, completed, tags, created_at, updated_at 
         FROM tasks 
         WHERE column_id = $1 
         ORDER BY position`,
        [column.id]
      );

      return {
       ...column,
        tasks: tasksResult.rows,
      };
    })
  );

  res.json({
    success: true,
    data: columns,
  });
}));

module.exports = router;