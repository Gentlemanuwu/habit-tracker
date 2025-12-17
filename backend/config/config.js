require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'habit_tracker',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // максимальное количество клиентов в пуле
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_this',
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  
  points: {
    habitCompletion: 10,
    taskCompletion: 5,
    streakBonus: 5, // за каждый день стрика
    achievementMultiplier: {
      bronze: 1,
      silver: 2.5,
      gold: 5,
      platinum: 10,
    },
  },
  
  achievements: {
    types: {
      first_habit: { points: 10, rarity: 'bronze', icon: '🌟' },
      first_task: { points: 10, rarity: 'bronze', icon: '✅' },
      streak_7: { points: 25, rarity: 'silver', icon: '🔥' },
      streak_30: { points: 50, rarity: 'gold', icon: '💎' },
      streak_100: { points: 100, rarity: 'platinum', icon: '👑' },
      streak_365: { points: 250, rarity: 'platinum', icon: '🏆' },
      habits_10: { points: 15, rarity: 'bronze', icon: '📊' },
      habits_50: { points: 40, rarity: 'silver', icon: '📈' },
      habits_100: { points: 75, rarity: 'gold', icon: '🎯' },
      tasks_10: { points: 15, rarity: 'bronze', icon: '✔️' },
      tasks_50: { points: 40, rarity: 'silver', icon: '✔️✔️' },
      tasks_100: { points: 75, rarity: 'gold', icon: '💯' },
      perfect_week: { points: 50, rarity: 'gold', icon: '⭐' },
    },
  },
  
  levels: {
    pointsPerLevel: 100,
    getLevel: (points) => Math.floor(points / 100) + 1,
  },
};