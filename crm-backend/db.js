import pg from 'pg';
import dotenv from 'dotenv';

// Загружаем .env
dotenv.config();

const { Pool } = pg;

// Используем значения напрямую из process.env с жесткими дефолтами для Docker
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'telegram_bot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

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
