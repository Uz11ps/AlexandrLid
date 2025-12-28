import pg from 'pg';

// Принудительная очистка переменных окружения от пробелов и \r
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return String(value).trim().replace(/\r/g, '');
};

const dbConfig = {
  host: getEnv('DB_HOST', 'postgres'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  database: getEnv('DB_NAME', 'telegram_bot_db'),
  user: getEnv('DB_USER', 'postgres'),
  password: getEnv('DB_PASSWORD', 'postgres'),
  max: 10,
  idleTimeoutMillis: 30000,
};

console.log(`🔍 [DB] Connecting to ${dbConfig.host} as ${dbConfig.user} (pass length: ${dbConfig.password.length})`);

const pool = new pg.Pool(dbConfig);

// Тестовый запрос
pool.query('SELECT 1', (err) => {
  if (err) console.error('❌ [DB] Connection Error:', err.message);
  else console.log('✅ [DB] Connected successfully');
});

export default pool;
