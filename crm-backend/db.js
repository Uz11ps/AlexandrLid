import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const dbConfig = {
  host: (process.env.DB_HOST || 'postgres').trim(),
  port: parseInt((process.env.DB_PORT || '5432').trim()),
  database: (process.env.DB_NAME || 'telegram_bot_db').trim(),
  user: (process.env.DB_USER || 'postgres').trim(),
  password: (process.env.DB_PASSWORD || 'postgres').trim(),
  // Настройки пула для стабильности
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Единственная проверка при старте
pool.query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Global connection established'))
  .catch(err => console.error('❌ [DB] Connection failed:', err.message));

export default pool;
