import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

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
  return pass[0] + '*'.repeat(pass.length - 2) + pass[pass.length - 1];
};

let pool = new pg.Pool(dbConfig);

(async () => {
  console.log(`🔍 [DB] Connecting... (pass: ${maskPassword(dbConfig.password)}, len: ${dbConfig.password.length})`);
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ [DB] Connected successfully');
  } catch (err) {
    if (dbConfig.password !== 'postgres') {
      console.log('⚠️ [DB] Primary failed, trying fallback "postgres"...');
      try {
        const fallbackPool = new pg.Pool({ ...dbConfig, password: 'postgres' });
        const client = await fallbackPool.connect();
        client.release();
        pool = fallbackPool;
        console.log('✅ [DB] Connected using fallback');
      } catch (e) {
        console.error('❌ [DB] ALL CONNECTION ATTEMPTS FAILED');
      }
    }
  }
})();

export default pool;

export default pool;

export default pool;
