import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'telegram_bot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
});

// Тестовый запрос при загрузке модуля
pool.query('SELECT 1', (err) => {
  if (err) console.error('❌ [DB] Connection Error:', err.message);
  else console.log('✅ [DB] Connected successfully');
});

export default pool;
