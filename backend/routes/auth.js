const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { ValidationError, ConflictError, AuthenticationError } = require('../utils/errors');
const { asyncHandler } = require('../utils/errors');

const router = express.Router();

// POST /api/auth/register - Регистрация нового пользователя
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Валидация
  if (!username ||!email ||!password) {
    throw new ValidationError('Username, email and password are required');
  }

  if (password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters long');
  }

  // Проверка существования пользователя
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existingUser.rows.length > 0) {
    throw new ConflictError('User with this email or username already exists');
  }

  // Хеширование пароля
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Создание пользователя
  const result = await query(
    `INSERT INTO users (username, email, password_hash, total_points, level) 
     VALUES ($1, $2, $3, 0, 1) 
     RETURNING id, username, email, total_points, level, created_at`,
    [username, email, passwordHash]
  );

  const user = result.rows[0];

  // Генерация JWT токена
  const token = generateToken(user.id, user.email);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        total_points: user.total_points,
        level: user.level,
        created_at: user.created_at,
      },
      token,
    },
  });
}));

// POST /api/auth/login - Вход пользователя
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Валидация
  if (!email ||!password) {
    throw new ValidationError('Email and password are required');
  }

  // Поиск пользователя
  const result = await query(
    'SELECT id, username, email, password_hash, total_points, level FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new AuthenticationError('Invalid email or password');
  }

  const user = result.rows[0];

  // Проверка пароля
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Генерация JWT токена
  const token = generateToken(user.id, user.email);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        total_points: user.total_points,
        level: user.level,
      },
      token,
    },
  });
}));

// GET /api/auth/me - Получить информацию о текущем пользователе
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, username, email, total_points, level, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AuthenticationError('User not found');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

module.exports = router;