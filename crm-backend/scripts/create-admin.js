import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'telegram_bot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createAdmin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Administrator';

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO managers (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name
       RETURNING *`,
      [email, passwordHash, name, 'admin']
    );

    console.log('✅ Администратор создан/обновлен:');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].name}`);
    console.log(`   Role: ${result.rows[0].role}`);
  } catch (error) {
    console.error('❌ Ошибка при создании администратора:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();

