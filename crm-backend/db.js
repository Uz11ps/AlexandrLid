import pg from 'pg';

// В Docker-среде переменные окружения доступны напрямую через process.env
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return String(value).split('#')[0].trim().replace(/\r/g, '');
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

console.log(`🔍 [DB] Connecting to ${dbConfig.host} as ${dbConfig.user} (len: ${dbConfig.password.length})`);

const pool = new pg.Pool(dbConfig);

// Проверка подключения при старте
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ [DB] Connection error:', err.message);
  } else {
    console.log('✅ [DB] Connected successfully');
  }
});

export default pool;
