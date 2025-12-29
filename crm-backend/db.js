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
  idleTimeoutMillis: 30000,
});

// Глобальное состояние
let currentPassword = getEnv('DB_PASSWORD', 'postgres');
console.log(`🔍 [Backend DB] Initial password from env: len=${currentPassword.length}, host=${getEnv('DB_HOST', 'telegram_db_alex')}`);
let pool = createPool(currentPassword);

// Функция создания пула с обработчиками ошибок
function createPool(password) {
  const newPool = new Pool(getDbConfig(password));
  newPool.on('error', (err) => {
    if (err.message.includes('password authentication failed')) {
      console.log(`⚠️ [Backend DB] Pool error: auth failed`);
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
    return await pool.query(text, params);
  } catch (err) {
    if (err.message.includes('password authentication failed') || err.code === '28P01') {
      console.log(`⚠️ [Backend DB] Auth failed with current password (len: ${currentPassword.length}). Starting recovery...`);
      
      // ПРИНУДИТЕЛЬНО пересоздаем пул перед попытками восстановления
      console.log(`🔄 [Backend DB] Recreating pool before recovery attempts...`);
      const oldPool = pool;
      pool = createPool(currentPassword);
      setTimeout(() => oldPool.end().catch(() => {}), 1000);
      
      const envPass = getEnv('DB_PASSWORD', 'postgres');
      const passwords = [envPass, 'postgres', currentPassword, '', 'password'];
      
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

// Проверка подключения
query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Connected successfully'))
  .catch(err => console.error('❌ [DB] Connection error:', err.message));

export default pool;
