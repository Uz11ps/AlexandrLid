import pool from '../db.js';

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Создание таблицы roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Вставка стандартных ролей
    await client.query(`
      INSERT INTO roles (name, description, is_system) VALUES
      ('admin', 'Полный доступ ко всем функциям', TRUE),
      ('manager', 'Работа с лидами и перепиской', TRUE),
      ('marketer', 'Маркетинг и аналитика', TRUE),
      ('accountant', 'Просмотр финансовых данных', TRUE)
      ON CONFLICT (name) DO NOTHING
    `);

    // Изменение таблицы managers для использования внешнего ключа на roles
    // Сначала проверяем, существует ли уже внешний ключ
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'managers' 
      AND constraint_type = 'FOREIGN KEY' 
      AND constraint_name LIKE '%role%'
    `);

    if (constraintCheck.rows.length === 0) {
      // Добавляем внешний ключ, если его еще нет
      await client.query(`
        ALTER TABLE managers 
        ADD CONSTRAINT managers_role_fkey 
        FOREIGN KEY (role) REFERENCES roles(name) ON DELETE RESTRICT
      `);
    }

    await client.query('COMMIT');
    console.log('Migration 002_create_roles: completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 002_create_roles: failed', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Удаление внешнего ключа
    await client.query(`
      ALTER TABLE managers 
      DROP CONSTRAINT IF EXISTS managers_role_fkey
    `);

    // Удаление таблицы roles
    await client.query('DROP TABLE IF EXISTS roles CASCADE');

    await client.query('COMMIT');
    console.log('Migration 002_create_roles: rolled back');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 002_create_roles: rollback failed', error);
    throw error;
  } finally {
    client.release();
  }
}

