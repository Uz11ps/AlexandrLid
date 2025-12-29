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
const pool = new Pool(getDbConfig(initialPassword));

// Сохраняем оригинальный метод
const originalPoolQuery = pool.query.bind(pool);

// Переопределяем метод query для ВСЕГО пула (автоматический fallback)
pool.query = async function(text, params) {
  try {
    return await originalPoolQuery(text, params);
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log('⚠️ [Backend DB] Auth failed, trying fallback password...');
      const tempPool = new Pool(getDbConfig('postgres'));
      try {
        const res = await tempPool.query(text, params);
        console.log('✅ [Backend DB] Fallback worked!');
        await tempPool.end().catch(() => {});
        return res;
      } catch (fallbackErr) {
        await tempPool.end().catch(() => {});
        throw err;
      }
    }
    throw err;
  }
};

// Экспортируем функцию запроса (теперь она вызывает обернутый pool.query)
export const query = (text, params) => pool.query(text, params);

// Проверка подключения
pool.query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Connected successfully'))
  .catch(err => console.error('❌ [DB] Connection error:', err.message));

export default pool;
