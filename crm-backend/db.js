import pg from 'pg';

const { Pool } = pg;

// Принудительная очистка переменных окружения
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return String(value).split('#')[0].trim().replace(/\r/g, '');
};

const getDbConfig = (password) => ({
  host: getEnv('DB_HOST', 'postgres'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  database: getEnv('DB_NAME', 'telegram_bot_db'),
  user: getEnv('DB_USER', 'postgres'),
  password: password,
  max: 10,
  idleTimeoutMillis: 30000,
});

const initialPassword = getEnv('DB_PASSWORD', 'postgres');
let pool = new Pool(getDbConfig(initialPassword));

// Функция для безопасного выполнения запросов с авто-переподключением
export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log('⚠️ [DB] Auth failed, trying standard password...');
      const fallbackPool = new Pool(getDbConfig('postgres'));
      try {
        const res = await fallbackPool.query(text, params);
        const oldPool = pool;
        pool = fallbackPool;
        oldPool.end().catch(() => {});
        return res;
      } catch (fallbackErr) {
        await fallbackPool.end().catch(() => {});
        throw err;
      }
    }
    throw err;
  }
};

// Проверка подключения
query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Connected successfully'))
  .catch(err => console.error('❌ [DB] Connection error:', err.message));

export default pool;
