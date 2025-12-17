const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/config');

// Функция для инициализации базы данных
async function initDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗄️  Инициализация базы данных PostgreSQL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Подключаемся к postgres для создания базы данных
  const adminPool = new Pool({
   ...config.database,
    database: 'postgres', // подключаемся к системной БД
  });

  try {
    // Проверяем существование базы данных
    console.log(`\n📊 Проверка базы данных "${config.database.database}"...`);
    
    const dbCheckQuery = `
      SELECT 1 FROM pg_database WHERE datname = $1
    `;
    const dbExists = await adminPool.query(dbCheckQuery, [config.database.database]);

    if (dbExists.rows.length === 0) {
      // Создаем базу данных
      console.log(`📝 Создание базы данных "${config.database.database}"...`);
      await adminPool.query(`CREATE DATABASE ${config.database.database}`);
      console.log('✅ База данных создана успешно');
    } else {
      console.log('✅ База данных уже существует');
    }

    await adminPool.end();

    // Подключаемся к созданной базе данных
    const pool = new Pool(config.database);

    // Читаем SQL схему
    console.log('\n📄 Чтение SQL схемы...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Файл схемы не найден: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Выполняем SQL схему
    console.log('⚙️  Выполнение SQL схемы...');
    await pool.query(schemaSql);
    console.log('✅ Схема базы данных создана успешно');

    // Проверяем созданные таблицы
    console.log('\n📋 Проверка созданных таблиц...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tables = await pool.query(tablesQuery);

    console.log('\n✨ Созданные таблицы:');
    tables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Проверяем тестовые данные
    console.log('\n🔍 Проверка тестовых данных...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const habitCount = await pool.query('SELECT COUNT(*) FROM habits');
    const taskCount = await pool.query('SELECT COUNT(*) FROM tasks');

    console.log(`   👤 Пользователи: ${userCount.rows[0].count}`);
    console.log(`   🎯 Привычки: ${habitCount.rows[0].count}`);
    console.log(`   ✅ Задачи: ${taskCount.rows[0].count}`);

    await pool.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Инициализация базы данных завершена успешно!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Для запуска сервера выполните: npm start');
    console.log('💡 Для разработки: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Ошибка при инициализации базы данных:');
    console.error(error.message);
    console.error('\n📝 Проверьте:');
    console.error('   1. PostgreSQL запущен');
    console.error('   2. Параметры подключения в.env файле');
    console.error('   3. Права доступа пользователя базы данных\n');
    process.exit(1);
  }
}

// Запуск инициализации
initDatabase();