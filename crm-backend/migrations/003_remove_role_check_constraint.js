import pool from '../db.js';

export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Проверяем, существует ли CHECK constraint на колонке role
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'managers' 
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%role%'
    `);

    if (constraintCheck.rows.length > 0) {
      const constraintName = constraintCheck.rows[0].constraint_name;
      console.log(`Removing CHECK constraint: ${constraintName}`);
      
      await client.query(`
        ALTER TABLE managers 
        DROP CONSTRAINT IF EXISTS ${constraintName}
      `);
      
      console.log(`✅ CHECK constraint ${constraintName} removed`);
    } else {
      console.log('✅ No CHECK constraint found on managers.role');
    }

    await client.query('COMMIT');
    console.log('✅ Migration 003_remove_role_check_constraint: completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 003_remove_role_check_constraint: failed', error);
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

    // Восстанавливаем CHECK constraint (опционально, если нужно откатить миграцию)
    await client.query(`
      ALTER TABLE managers 
      ADD CONSTRAINT managers_role_check 
      CHECK (role IN ('admin', 'manager', 'marketer', 'accountant'))
    `);

    await client.query('COMMIT');
    console.log('Migration 003_remove_role_check_constraint: rolled back');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 003_remove_role_check_constraint: rollback failed', error);
    throw error;
  } finally {
    client.release();
  }
}

