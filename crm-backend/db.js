import pg from 'pg';
import dotenv from 'dotenv';

// Загружаем .env
dotenv.config();

const { Pool } = pg;

// Очищаем переменные от возможных скрытых символов (пробелы, \r и т.д.)
const dbConfig = {
  host: (process.env.DB_HOST || 'postgres').trim(),
  port: parseInt((process.env.DB_PORT || '5432').trim()),
  database: (process.env.DB_NAME || 'telegram_bot_db').trim(),
  user: (process.env.DB_USER || 'postgres').trim(),
  password: (process.env.DB_PASSWORD || 'postgres').trim(),
};

console.log('🔍 [DB Singleton] Connection attempt with user:', dbConfig.user);

const pool = new Pool(dbConfig);

// Проверка подключения при старте
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ [DB Singleton] Initial connection failed:', err.message);
  } else {
    console.log('✅ [DB Singleton] Connection established');
  }
});

pool.on('error', (err) => {
  console.error('❌ [DB Pool] Unexpected error:', err);
});

export default pool;
