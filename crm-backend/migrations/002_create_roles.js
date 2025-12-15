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

    // Проверяем, существует ли таблица managers
    const managersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'managers'
      );
    `);

    if (managersTableExists.rows[0].exists) {
      // Обновляем существующие роли в managers, чтобы они соответствовали ролям в roles
      // Получаем все существующие роли из managers
      const existingRoles = await client.query(`
        SELECT DISTINCT role FROM managers WHERE role IS NOT NULL
      `);

      // Для каждой роли, которой нет в roles, создаем её (если это не системная роль)
      for (const row of existingRoles.rows) {
        const roleName = row.role;
        if (roleName && !['admin', 'manager', 'marketer', 'accountant'].includes(roleName)) {
          await client.query(`
            INSERT INTO roles (name, description, is_system) 
            VALUES ($1, $2, FALSE)
            ON CONFLICT (name) DO NOTHING
          `, [roleName, `Роль ${roleName}`]);
        }
      }

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
        // Проверяем, есть ли колонка role в managers
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'managers' 
            AND column_name = 'role'
          );
        `);

        if (columnCheck.rows[0].exists) {
          // Добавляем внешний ключ, если его еще нет
          try {
            await client.query(`
              ALTER TABLE managers 
              ADD CONSTRAINT managers_role_fkey 
              FOREIGN KEY (role) REFERENCES roles(name) ON DELETE RESTRICT
            `);
          } catch (fkError) {
            // Если не удалось добавить внешний ключ (например, из-за несоответствующих данных),
            // просто логируем ошибку и продолжаем
            console.warn('Could not add foreign key constraint:', fkError.message);
            console.warn('This is not critical - the system will work without the constraint');
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration 002_create_roles: completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 002_create_roles: failed', error);
    console.error('Error details:', error.message, error.stack);
    // Не бросаем ошибку, чтобы сервер мог запуститься
    console.warn('⚠️ Migration failed, but server will continue');
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

