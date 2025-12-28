import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

// Функция для безопасного получения переменной
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

console.log(`🔍 [DB] Connecting as ${dbConfig.user} to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const pool = new Pool(dbConfig);

// Тестовый запрос
pool.query('SELECT 1', (err) => {
  if (err) console.error('❌ [DB] Connection Error:', err.message);
  else console.log('✅ [DB] Connected successfully');
});

export default pool;
