import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'telegram_db_alex',
  port: 5432,
  database: 'telegram_bot_db',
  user: 'postgres',
  password: 'postgres',
  ssl: false,
});

console.log('Attempting to connect...');
try {
  await client.connect();
  console.log('✅ Connection successful!');
  const result = await client.query('SELECT 1');
  console.log('✅ Query successful!', result.rows);
  await client.end();
  process.exit(0);
} catch (e) {
  console.error('❌ Connection failed:', e.message);
  console.error('Error code:', e.code);
  console.error('Error detail:', e.detail);
  process.exit(1);
}

