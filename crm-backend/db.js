import pg from 'pg';

const { Pool } = pg;

// Принудительная очистка переменных окружения
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return String(value)
    .split('#')[0]
    .trim()
    .replace(/\r/g, '')
    .replace(/^["']|["']$/g, ''); // Удаляем кавычки
};

const getDbConfig = (password) => ({
  host: getEnv('DB_HOST', 'telegram_db_alex'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  database: getEnv('DB_NAME', 'telegram_bot_db'),
  user: getEnv('DB_USER', 'postgres'),
  password: password,
  max: 10,
  idleTimeoutMillis: 300000, // 5 минут вместо 30 секунд
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
});

// Глобальное состояние
let currentPassword = getEnv('DB_PASSWORD', 'postgres');
const rawDbPassword = process.env.DB_PASSWORD;
const dbHost = getEnv('DB_HOST', 'telegram_db_alex');
const dbPort = getEnv('DB_PORT', '5432');
const dbName = getEnv('DB_NAME', 'telegram_bot_db');
const dbUser = getEnv('DB_USER', 'postgres');

console.log(`🔍 [Backend DB] ========== INITIALIZATION ==========`);
console.log(`🔍 [Backend DB] DB_HOST: ${dbHost}`);
console.log(`🔍 [Backend DB] DB_PORT: ${dbPort}`);
console.log(`🔍 [Backend DB] DB_NAME: ${dbName}`);
console.log(`🔍 [Backend DB] DB_USER: ${dbUser}`);
console.log(`🔍 [Backend DB] DB_PASSWORD (getEnv): "${currentPassword}" (len: ${currentPassword.length})`);
console.log(`🔍 [Backend DB] DB_PASSWORD (raw): "${rawDbPassword}" (type: ${typeof rawDbPassword}, len: ${rawDbPassword ? rawDbPassword.length : 'undefined'})`);
console.log(`🔍 [Backend DB] All DB_* env vars:`, {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: rawDbPassword ? `[${rawDbPassword.length} chars]` : 'undefined'
});
console.log(`🔍 [Backend DB] =====================================`);

let pool = createPool(currentPassword);

// Функция создания пула с обработчиками ошибок
function createPool(password) {
  const config = getDbConfig(password);
  const newPool = new Pool(config);
  
  // Обработчик подключения - логируем создание нового соединения
  newPool.on('connect', (client) => {
    const actualPassword = getEnv('DB_PASSWORD', 'postgres');
    console.log(`🔌 [Backend DB] New connection established with password len=${password.length}, env password len=${actualPassword.length}`);
    if (password !== actualPassword) {
      console.log(`⚠️ [Backend DB] WARNING: Pool password (len=${password.length}) differs from env password (len=${actualPassword.length})!`);
    }
  });
  
  // Обработчик получения клиента из пула
  newPool.on('acquire', (client) => {
    const actualPassword = getEnv('DB_PASSWORD', 'postgres');
    if (password !== actualPassword) {
      console.log(`⚠️ [Backend DB] Acquiring client with outdated password (len=${password.length}), env has len=${actualPassword.length}`);
    }
  });
  
  // Обработчик ошибок пула
  newPool.on('error', (err, client) => {
    const actualPassword = getEnv('DB_PASSWORD', 'postgres');
    if (err.message.includes('password authentication failed')) {
      console.log(`⚠️ [Backend DB] Pool error: auth failed (pool password len=${password.length}, env password len=${actualPassword.length})`);
    } else {
      console.error(`❌ [Backend DB] Pool error:`, err.message);
    }
  });
  
  return newPool;
}

// Функция смены пула на лету
const switchPool = (newPassword) => {
  console.log(`🔄 [Backend DB] Switching to password length: ${newPassword.length}`);
  const oldPool = pool;
  currentPassword = newPassword;
  pool = createPool(newPassword);
  setTimeout(() => oldPool.end().catch(() => {}), 5000);
};

// Глобальный перехватчик запросов
export const query = async (text, params) => {
  try {
    // ПЕРЕД каждым запросом проверяем, что пул использует актуальный пароль из окружения
    const envPass = getEnv('DB_PASSWORD', 'postgres');
    if (envPass !== currentPassword) {
      console.log(`🔄 [Backend DB] Password changed in env (${currentPassword.length} -> ${envPass.length}), updating pool...`);
      switchPool(envPass);
    }
    
    return await pool.query(text, params);
  } catch (err) {
    if (err.message.includes('password authentication failed') || err.code === '28P01') {
      // Получаем СВЕЖИЙ пароль из окружения ПЕРЕД логированием
      const envPass = getEnv('DB_PASSWORD', 'postgres');
      
      console.log(`⚠️ [Backend DB] Auth failed with current password (len: ${currentPassword.length}). Starting recovery...`);
      console.log(`🔍 [Backend DB] Current password: "${currentPassword}"`);
      console.log(`🔍 [Backend DB] Env password (getEnv): "${envPass}"`);
      console.log(`🔍 [Backend DB] Raw process.env.DB_PASSWORD: "${rawDbPassword}" (type: ${typeof rawDbPassword}, len: ${rawDbPassword ? rawDbPassword.length : 'undefined'})`);
      console.log(`🔍 [Backend DB] Match: ${currentPassword === envPass}`);
      
      // ПРИНУДИТЕЛЬНО пересоздаем пул перед попытками восстановления
      console.log(`🔄 [Backend DB] Recreating pool before recovery attempts...`);
      const oldPool = pool;
      // Используем СВЕЖИЙ пароль из окружения, а не кэшированный
      pool = createPool(envPass);
      currentPassword = envPass; // Обновляем кэш
      setTimeout(() => oldPool.end().catch(() => {}), 1000);
      
      const passwords = [envPass, 'postgres', '', 'password', 'admin', 'root'];
      
      // Убираем дубликаты, но сохраняем порядок приоритета
      const uniquePasswords = [];
      const seen = new Set();
      for (const pass of passwords) {
        if (!seen.has(pass)) {
          seen.add(pass);
          uniquePasswords.push(pass);
        }
      }
      
      console.log(`🔍 [Backend DB] Will try ${uniquePasswords.length} unique passwords...`);
      
      for (let i = 0; i < uniquePasswords.length; i++) {
        const pass = uniquePasswords[i];
        console.log(`🔑 [Backend DB] Trying password #${i+1} (len: ${pass.length})...`);
        const testPool = createPool(pass);
        try {
          const testRes = await testPool.query('SELECT 1');
          const res = await testPool.query(text, params);
          console.log(`✅ [Backend DB] Recovery successful with password #${i+1}!`);
          switchPool(pass);
          await testPool.end().catch(() => {});
          return res;
        } catch (e) {
          console.log(`❌ [Backend DB] Password #${i+1} failed: ${e.message.substring(0, 60)}...`);
          await testPool.end().catch(() => {});
        }
      }
      console.error('❌ [Backend DB] All recovery passwords failed!');
      console.error(`❌ [Backend DB] Current password: "${currentPassword}", Env password: "${envPass}"`);
    }
    throw err;
  }
};

// Функция для получения клиента из пула (для транзакций в миграциях)
export const connect = async () => {
  // Убеждаемся, что пул использует актуальный пароль
  const envPass = getEnv('DB_PASSWORD', 'postgres');
  if (envPass !== currentPassword) {
    console.log(`🔄 [Backend DB] Password changed in env (${currentPassword.length} -> ${envPass.length}), updating pool...`);
    switchPool(envPass);
  }
  return await pool.connect();
};

// Проверка подключения
query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Connected successfully'))
  .catch(err => console.error('❌ [DB] Connection error:', err.message));

export default pool;
