import pool from '../db.js';

export async function up() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🛠️ [Migration 006] Fixing missing columns in existing tables...');

        // Фикс для шаблонов документов
        await client.query(`
            ALTER TABLE document_templates 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);

        // Фикс для тикетов
        await client.query(`
            ALTER TABLE tickets 
            ADD COLUMN IF NOT EXISTS manager_id INTEGER,
            ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // Фикс для задач
        await client.query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS manager_id INTEGER,
            ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'reminder',
            ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal';
        `);

        // Создание таблицы deals (Сделки), если её нет
        await client.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                manager_id INTEGER,
                title VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'RUB',
                stage VARCHAR(50) DEFAULT 'new',
                status VARCHAR(50) DEFAULT 'active',
                description TEXT,
                expected_close_date DATE,
                closed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Фикс для лидов (все недостающие поля из кода)
        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS country VARCHAR(100),
            ADD COLUMN IF NOT EXISTS city VARCHAR(100),
            ADD COLUMN IF NOT EXISTS age INTEGER,
            ADD COLUMN IF NOT EXISTS utm_source VARCHAR(255),
            ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(255),
            ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
            ADD COLUMN IF NOT EXISTS trading_experience VARCHAR(50),
            ADD COLUMN IF NOT EXISTS interested_course TEXT,
            ADD COLUMN IF NOT EXISTS budget VARCHAR(100),
            ADD COLUMN IF NOT EXISTS ready_to_start VARCHAR(50),
            ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(100),
            ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
            ADD COLUMN IF NOT EXISTS tags TEXT[],
            ADD COLUMN IF NOT EXISTS manager_id INTEGER,
            ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS converted_to_student_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium',
            ADD COLUMN IF NOT EXISTS source VARCHAR(100);
        `);

        // Фикс для студентов
        await client.query(`
            ALTER TABLE students 
            ADD COLUMN IF NOT EXISTS contract_number VARCHAR(100),
            ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(10) DEFAULT 'RUB',
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
            ADD COLUMN IF NOT EXISTS installment_plan BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS installment_periods INTEGER,
            ADD COLUMN IF NOT EXISTS materials_access BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS curator_id INTEGER,
            ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS graduation_date DATE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // Фикс для платежей
        await client.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'RUB',
            ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'full',
            ADD COLUMN IF NOT EXISTS installment_number INTEGER,
            ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS created_by INTEGER;
        `);

        // Создание таблицы debts (Долги), если её нет
        await client.query(`
            CREATE TABLE IF NOT EXISTS debts (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'RUB',
                due_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание таблицы lead_interactions, если её нет
        await client.query(`
            CREATE TABLE IF NOT EXISTS lead_interactions (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                manager_id INTEGER,
                interaction_type VARCHAR(50) NOT NULL,
                interaction_data JSONB,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание таблицы lead_comments, если её нет
        await client.query(`
            CREATE TABLE IF NOT EXISTS lead_comments (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                manager_id INTEGER,
                comment_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Фикс для курсов
        await client.query(`
            ALTER TABLE courses 
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        `);

        await client.query('COMMIT');
        console.log('✅ [Migration 006] Database schema fixed successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ [Migration 006] Failed to fix database schema:', error);
        // Не пробрасываем ошибку дальше, чтобы сервер мог запуститься
    } finally {
        client.release();
    }
}

export async function down() {
    // Не требуется
}

