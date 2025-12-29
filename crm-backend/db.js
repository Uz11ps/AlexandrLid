import pg from 'pg';

// В Docker-среде используем напрямую process.env
const dbConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'telegram_bot_db',
  user: process.env.DB_USER || 'postgres',
  password: (process.env.DB_PASSWORD || '').split('#')[0].trim().replace(/\r/g, ''),
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
