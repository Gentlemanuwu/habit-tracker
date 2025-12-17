const { Pool } = require('pg');
const config = require('./config');

// Создание пула подключений к PostgreSQL
const pool = new Pool(config.database);

// Обработка ошибок подключения
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Проверка подключения
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Функция для выполнения запросов
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (config.server.env === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Функция для получения клиента из пула (для транзакций)
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Переопределяем release для логирования
  client.release = () => {
    client.release = release;
    return release();
  };

  return client;
};

// Функция для выполнения транзакций
const transaction = async (callback) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Проверка подключения к базе данных
const testConnection = async () => {
  try {
    const res = await query('SELECT NOW()');
    console.log('Database connection test successful:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool has been closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

module.exports = {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  pool,
};