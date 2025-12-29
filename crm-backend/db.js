import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

// Загружаем .env принудительно
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const getEnv = (key, defaultValue) => {
  let value = process.env[key];
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

const maskPassword = (pass) => {
  if (!pass) return 'EMPTY';
  if (pass === 'postgres') return 'default (postgres)';
  if (pass.length <= 2) return '*'.repeat(pass.length);
  return pass[0] + '*'.repeat(pass.length - 2) + pass[pass.length - 1];
};

console.log(`🔍 [DB] Connecting to ${dbConfig.host} as ${dbConfig.user} (pass: ${maskPassword(dbConfig.password)}, len: ${dbConfig.password.length})`);

const pool = new pg.Pool(dbConfig);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ [DB] Connection error:', err.message);
  } else {
    console.log('✅ [DB] Connected successfully');
    release();
  }
});

export default pool;

export default pool;
