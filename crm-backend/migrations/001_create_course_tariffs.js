import pool from '../db.js';

/**
 * Миграция для создания таблицы course_tariffs
 * Выполняется автоматически при запуске приложения
 */
export async function createCourseTariffsTable() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Проверка существования таблицы courses
    const coursesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'courses'
      );
    `);
    
    if (!coursesTableExists.rows[0].exists) {
      console.log('Creating courses table...');
      await client.query(`
        CREATE TABLE courses (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          format VARCHAR(50) CHECK (format IN ('online', 'offline', 'hybrid')),
          duration_weeks INTEGER,
          program_structure JSONB,
          base_price DECIMAL(10, 2),
          currency VARCHAR(10) DEFAULT 'RUB',
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive', 'draft')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    // Проверка существования таблицы course_tariffs
    const tariffsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'course_tariffs'
      );
    `);
    
    if (!tariffsTableExists.rows[0].exists) {
      console.log('Creating course_tariffs table...');
      await client.query(`
        CREATE TABLE course_tariffs (
          id SERIAL PRIMARY KEY,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'RUB',
          features JSONB,
          installment_available BOOLEAN DEFAULT FALSE,
          order_index INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Создание индексов
      await client.query(`
        CREATE INDEX idx_course_tariffs_course_id ON course_tariffs(course_id);
        CREATE INDEX idx_course_tariffs_order ON course_tariffs(order_index);
        CREATE INDEX idx_course_tariffs_is_active ON course_tariffs(is_active);
      `);
      
      console.log('✅ Table course_tariffs created successfully');
    } else {
      console.log('✅ Table course_tariffs already exists');
    }
    
    // Добавление колонок в courses если их нет
    const columnsToAdd = [
      { name: 'author', type: 'VARCHAR(255)' },
      { name: 'cover_image', type: 'VARCHAR(500)' }
    ];
    
    for (const column of columnsToAdd) {
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'courses' 
          AND column_name = $1
        );
      `, [column.name]);
      
      if (!columnExists.rows[0].exists) {
        console.log(`Adding column ${column.name} to courses table...`);
        await client.query(`ALTER TABLE courses ADD COLUMN ${column.name} ${column.type};`);
      }
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating course_tariffs table:', error);
    throw error;
  } finally {
    client.release();
  }
}

