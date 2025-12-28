import pool from '../db.js';

/**
 * Миграция для инициализации расширенной схемы CRM
 * Создает таблицы: funnel_stages, courses, study_groups, students, и другие.
 */
export async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Таблица настраиваемой воронки продаж
    await client.query(`
      CREATE TABLE IF NOT EXISTS funnel_stages (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          order_index INTEGER NOT NULL,
          color VARCHAR(20) DEFAULT '#3498db',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(order_index)
      );
    `);

    // Вставка стандартных этапов воронки
    await client.query(`
      INSERT INTO funnel_stages (name, order_index, color) VALUES
      ('Новый лид', 1, '#3498db'),
      ('Первичный контакт', 2, '#9b59b6'),
      ('Квалификация', 3, '#e67e22'),
      ('Презентация курса', 4, '#f39c12'),
      ('Работа с возражениями', 5, '#e74c3c'),
      ('Отправка оффера', 6, '#1abc9c'),
      ('Ожидание оплаты', 7, '#16a085'),
      ('Конвертирован в студента', 8, '#27ae60'),
      ('Отказ', 9, '#95a5a6')
      ON CONFLICT (order_index) DO NOTHING;
    `);

    // 2. Таблица курсов
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          format VARCHAR(50) CHECK (format IN ('online', 'offline', 'hybrid')),
          duration_weeks INTEGER,
          program_structure JSONB,
          base_price DECIMAL(10, 2),
          currency VARCHAR(10) DEFAULT 'RUB',
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive', 'draft')),
          author VARCHAR(255),
          cover_image VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Таблица тарифных планов (packages)
    await client.query(`
      CREATE TABLE IF NOT EXISTS packages (
          id SERIAL PRIMARY KEY,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'RUB',
          duration_days INTEGER,
          features JSONB,
          additional_services TEXT[],
          installment_available BOOLEAN DEFAULT FALSE,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Таблица групп обучения
    await client.query(`
      CREATE TABLE IF NOT EXISTS study_groups (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
          start_date DATE,
          end_date DATE,
          curator_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
          max_students INTEGER DEFAULT 20,
          current_students INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Таблица студентов
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
          id SERIAL PRIMARY KEY,
          lead_id INTEGER NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
          contract_number VARCHAR(100),
          start_date DATE,
          course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
          package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
          payment_amount DECIMAL(10, 2),
          payment_currency VARCHAR(10) DEFAULT 'RUB',
          payment_method VARCHAR(50),
          payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
          installment_plan BOOLEAN DEFAULT FALSE,
          installment_amount DECIMAL(10, 2),
          installment_periods INTEGER,
          materials_access BOOLEAN DEFAULT FALSE,
          group_id INTEGER REFERENCES study_groups(id) ON DELETE SET NULL,
          curator_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
          progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
          graduation_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Таблица дополнительных услуг
    await client.query(`
      CREATE TABLE IF NOT EXISTS additional_services (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2),
          currency VARCHAR(10) DEFAULT 'RUB',
          duration_hours INTEGER,
          service_type VARCHAR(100),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Таблица платежей
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'RUB',
          payment_method VARCHAR(50),
          payment_date DATE NOT NULL,
          payment_type VARCHAR(50) CHECK (payment_type IN ('full', 'partial', 'installment', 'refund')),
          installment_number INTEGER,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
          transaction_id VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER REFERENCES managers(id) ON DELETE SET NULL
      );
    `);

    // 8. Таблица задолженностей
    await client.query(`
      CREATE TABLE IF NOT EXISTS debts (
          id SERIAL PRIMARY KEY,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'RUB',
          due_date DATE NOT NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue', 'written_off')),
          reminder_sent BOOLEAN DEFAULT FALSE,
          last_reminder_date DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Расширение существующих таблиц
    await client.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT FALSE;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_to_student_at TIMESTAMP;
    `);

    await client.query(`
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT FALSE;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_created_reason VARCHAR(255);
    `);

    // 10. Индексы
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_lead_id ON students(lead_id);
      CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
      CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
      CREATE INDEX IF NOT EXISTS idx_debts_student_id ON debts(student_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migration 000 (init full CRM) completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 000 failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

