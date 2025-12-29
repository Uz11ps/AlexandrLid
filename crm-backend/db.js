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
let pool = new Pool(getDbConfig(currentPassword));

// Функция смены пула на лету
const switchPool = (newPassword) => {
  console.log(`🔄 [Backend DB] Switching password...`);
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
      console.log('⚠️ [Backend DB] Auth failed. Starting recovery...');
      const passwords = [getEnv('DB_PASSWORD', 'postgres'), 'postgres', '', 'password'];
      
      for (const pass of passwords) {
        if (pass === currentPassword && passwords.indexOf(pass) === 0) continue;
        const testPool = new Pool(getDbConfig(pass));
        try {
          const res = await testPool.query(text, params);
          console.log('✅ [Backend DB] Recovery successful!');
          switchPool(pass);
          await testPool.end().catch(() => {});
          return res;
        } catch (e) {
          await testPool.end().catch(() => {});
        }
      }
    }
    throw err;
  }
};

// Проверка подключения
query('SELECT NOW()')
  .then(() => console.log('✅ [DB] Connected successfully'))
  .catch(err => console.error('❌ [DB] Connection error:', err.message));

export default pool;
