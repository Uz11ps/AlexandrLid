import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

// Принудительная очистка переменных окружения от пробелов, \r и комментариев
const getEnv = (key, defaultValue) => {
  let value = process.env[key];
  if (!value) return defaultValue;
  // Убираем комментарии (все что после #) и лишние пробелы/символы возврата каретки
  value = String(value).split('#')[0].trim().replace(/\r/g, '');
  return value || defaultValue;
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

const maskPassword = (pass) => {
  if (!pass) return 'none';
  if (pass === 'postgres') return 'default (postgres)';
  if (pass.length <= 2) return '*'.repeat(pass.length);
  return pass[0] + '*'.repeat(pass.length - 2) + pass[pass.length - 1];
};

console.log(`🔍 [DB] Attempting connection to ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user} (pass: ${maskPassword(dbConfig.password)}, len: ${dbConfig.password.length})`);

let pool = new pg.Pool(dbConfig);

// Автоматический откат к дефолтному паролю
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ [DB] Connected successfully');
    client.release();
  } catch (err) {
    if (err.message.includes('password authentication failed') && dbConfig.password !== 'postgres') {
      console.log('⚠️ [DB] Primary password failed, trying fallback "postgres"...');
      try {
        const fallbackPool = new pg.Pool({ ...dbConfig, password: 'postgres' });
        const client = await fallbackPool.connect();
        console.log('✅ [DB] Connected successfully using fallback!');
        pool = fallbackPool;
        client.release();
      } catch (e) {
        console.error('❌ [DB] All connection attempts failed.');
      }
    }
  }
})();

export default pool;
