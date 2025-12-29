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
let pool = new Pool(getDbConfig(currentPassword));

// Функция смены пула на лету
const switchPool = (newPassword) => {
  console.log(`🔄 [Backend DB] Switching to password length: ${newPassword.length}`);
  const oldPool = pool;
  currentPassword = newPassword;
  pool = new Pool(getDbConfig(newPassword));
  setTimeout(() => oldPool.end().catch(() => {}), 5000);
};

// Глобальный перехватчик запросов
export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log(`⚠️ [Backend DB] Auth failed with current password (len: ${currentPassword.length}). Starting recovery...`);
      const envPass = getEnv('DB_PASSWORD', 'postgres');
      const passwords = [envPass, 'postgres', '', 'password'];
      
      console.log(`🔍 [Backend DB] Will try ${passwords.length} passwords...`);
      
      for (let i = 0; i < passwords.length; i++) {
        const pass = passwords[i];
        if (pass === currentPassword && i === 0) {
          console.log(`⏭️  [Backend DB] Skipping password #${i+1} (same as failed one)`);
          continue;
        }
        
        console.log(`🔑 [Backend DB] Trying password #${i+1} (len: ${pass.length})...`);
        const testPool = new Pool(getDbConfig(pass));
        try {
          const res = await testPool.query(text, params);
          console.log(`✅ [Backend DB] Recovery successful with password #${i+1}!`);
          switchPool(pass);
          await testPool.end().catch(() => {});
          return res;
        } catch (e) {
          console.log(`❌ [Backend DB] Password #${i+1} failed: ${e.message.substring(0, 50)}...`);
          await testPool.end().catch(() => {});
        }
      }
      console.error('❌ [Backend DB] All recovery passwords failed!');
    }
    throw err;
  }
};

// Проверка подключения
query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Connected successfully'))
  .catch(err => console.error('❌ [DB] Connection error:', err.message));

export default pool;
