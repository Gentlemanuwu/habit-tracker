const express = require('express');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// Все маршруты требуют авторизации
router.use(authenticate);

// POST /api/columns - Создать новую колонку
router.post('/', asyncHandler(async (req, res) => {
  const { board_id, title, position, color = '#e5e7eb' } = req.body;

  if (!board_id ||!title) {
    throw new ValidationError('Board ID and title are required');
  }

  // Проверяем, что доска принадлежит пользователю
  const boardCheck = await query(
    'SELECT id FROM boards WHERE id = $1 AND user_id = $2',
    [board_id, req.user.id]
  );

  if (boardCheck.rows.length === 0) {
    throw new NotFoundError('Board not found');
  }

  // Если позиция не указана, добавляем в конец
  let finalPosition = position;
  if (finalPosition === undefined) {
    const maxPosResult = await query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM columns WHERE board_id = $1',
      [board_id]
    );
    finalPosition = maxPosResult.rows[0].max_pos + 1;
  }

  const result = await query(
    `INSERT INTO columns (board_id, title, position, color) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, board_id, title, position, color, created_at`,
    [board_id, title, finalPosition, color]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
}));

// PUT /api/columns/:id - Обновить колонку
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, position, color } = req.body;

  // Проверяем, что колонка принадлежит доске пользователя
  const columnCheck = await query(
    `SELECT c.id FROM columns c 
     JOIN boards b ON c.board_id = b.id 
     WHERE c.id = $1 AND b.user_id = $2`,
    [id, req.user.id]
  );

  if (columnCheck.rows.length === 0) {
    throw new NotFoundError('Column not found');
  }

  // Формируем динамический запрос для обновления
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (title!== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(title);
  }
  if (position!== undefined) {
    updates.push(`position = $${paramCount++}`);
    values.push(position);
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
    `UPDATE columns 
     SET ${updates.join(', ')} 
     WHERE id = $${paramCount} 
     RETURNING id, board_id, title, position, color, created_at`,
    values
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

// DELETE /api/columns/:id - Удалить колонку
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Проверяем, что колонка принадлежит доске пользователя
  const columnCheck = await query(
    `SELECT c.id FROM columns c 
     JOIN boards b ON c.board_id = b.id 
     WHERE c.id = $1 AND b.user_id = $2`,
    [id, req.user.id]
  );

  if (columnCheck.rows.length === 0) {
    throw new NotFoundError('Column not found');
  }

  // Удаляем колонку (задачи удалятся каскадно благодаря ON DELETE CASCADE)
  await query('DELETE FROM columns WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Column deleted successfully',
  });
}));

module.exports = router;