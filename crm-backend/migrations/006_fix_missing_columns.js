import pool from '../db.js';

export async function up() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🛠️ [Migration 006] Final Definitive Schema Sync starting...');

        // 1. COURSES
        await client.query(`
            ALTER TABLE courses 
            ADD COLUMN IF NOT EXISTS format VARCHAR(50) DEFAULT 'online',
            ADD COLUMN IF NOT EXISTS duration_weeks INTEGER,
            ADD COLUMN IF NOT EXISTS program_structure JSONB,
            ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2),
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'RUB',
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // 2. LEADS
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

        // 3. STUDENTS
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

        // 4. TICKETS & MESSAGES
        await client.query(`
            ALTER TABLE tickets 
            ADD COLUMN IF NOT EXISTS manager_id INTEGER,
            ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
            ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal',
            ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

            CREATE TABLE IF NOT EXISTS ticket_messages (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                sender_type VARCHAR(20) NOT NULL, -- 'user', 'manager', 'admin'
                sender_id BIGINT NOT NULL,
                message_text TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. DOCUMENTS
        await client.query(`
            ALTER TABLE documents 
            ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS deal_id INTEGER,
            ADD COLUMN IF NOT EXISTS template_id INTEGER,
            ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
            ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS file_path TEXT,
            ADD COLUMN IF NOT EXISTS file_size INTEGER,
            ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
            ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS created_by INTEGER,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // 6. TASKS
        await client.query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS manager_id INTEGER,
            ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'reminder',
            ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal',
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // 7. MESSAGE_TEMPLATES
        await client.query(`
            ALTER TABLE message_templates 
            ADD COLUMN IF NOT EXISTS category VARCHAR(100),
            ADD COLUMN IF NOT EXISTS template_text TEXT,
            ADD COLUMN IF NOT EXISTS variables JSONB,
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS created_by INTEGER,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // 8. DEALS
        await client.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
                product_id INTEGER,
                product_type VARCHAR(50),
                manager_id INTEGER,
                title VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'RUB',
                stage VARCHAR(50) DEFAULT 'new',
                status VARCHAR(50) DEFAULT 'active',
                probability_percent INTEGER DEFAULT 0,
                source VARCHAR(100),
                payment_method VARCHAR(50),
                description TEXT,
                expected_close_date DATE,
                actual_close_date DATE,
                closed_at TIMESTAMP,
                commission DECIMAL(10, 2) DEFAULT 0,
                net_profit DECIMAL(10, 2) DEFAULT 0,
                acquisition_cost DECIMAL(10, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 9. OTHER TABLES (DEBTS, INTERACTIONS, COMMENTS, OBJECTIONS, SERVICES, TARIFFS)
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

            CREATE TABLE IF NOT EXISTS lead_interactions (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                manager_id INTEGER,
                interaction_type VARCHAR(50) NOT NULL,
                interaction_data JSONB,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS lead_comments (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
                manager_id INTEGER,
                comment_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS objection_responses (
                id SERIAL PRIMARY KEY,
                objection_type VARCHAR(100) NOT NULL,
                response_text TEXT NOT NULL,
                category VARCHAR(100),
                effectiveness_rating DECIMAL(3, 2),
                usage_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS additional_services (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'RUB',
                duration_hours INTEGER,
                service_type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS course_tariffs (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
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

        // 10. PAYMENTS FIX
        await client.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'RUB',
            ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'full',
            ADD COLUMN IF NOT EXISTS installment_number INTEGER,
            ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS created_by INTEGER;
        `);

        // 11. ANALYTICS RELATED (ADD MISSING COLUMNS IN LEADS)
        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS fio VARCHAR(255),
            ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
        `);

        // 12. ENSURE DEALS HAS TITLE (IT WAS MISSING IN SOME COPIES)
        await client.query(`
            ALTER TABLE deals 
            ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Новая сделка';
        `);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ [Migration 006] Schema sync FAILED:', error);
    } finally {
        client.release();
    }
}

export async function down() {}
