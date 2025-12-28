import pool from '../db.js';

export async function up() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('📦 [Init CRM] Creating core tables...');

        // 1. Справочники и воронка
        await client.query(`
            CREATE TABLE IF NOT EXISTS funnel_stages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                order_index INTEGER NOT NULL UNIQUE,
                color VARCHAR(20) DEFAULT '#3498db',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Курсы и тарифы
        await client.query(`
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                format VARCHAR(50) DEFAULT 'online',
                duration_weeks INTEGER,
                base_price DECIMAL(10, 2),
                currency VARCHAR(10) DEFAULT 'RUB',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS packages (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                features JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Лиды и пользователи
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                user_id BIGINT,
                fio VARCHAR(255),
                phone VARCHAR(50),
                email VARCHAR(255),
                telegram_username VARCHAR(255),
                source VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Новый лид',
                funnel_stage VARCHAR(100) DEFAULT 'Новый лид',
                manager_id INTEGER,
                priority VARCHAR(20) DEFAULT 'medium',
                notes TEXT,
                is_student BOOLEAN DEFAULT FALSE,
                converted_to_student_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Студенты и Группы
        await client.query(`
            CREATE TABLE IF NOT EXISTS study_groups (
                id SERIAL PRIMARY KEY,
                course_id INTEGER REFERENCES courses(id),
                name VARCHAR(100) NOT NULL,
                start_date DATE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
                course_id INTEGER REFERENCES courses(id),
                package_id INTEGER REFERENCES packages(id),
                group_id INTEGER REFERENCES study_groups(id),
                payment_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Финансы
        await client.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id),
                amount DECIMAL(10, 2) NOT NULL,
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                payment_method VARCHAR(50),
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Задачи
        await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER REFERENCES leads(id),
                manager_id INTEGER,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date TIMESTAMP,
                status VARCHAR(50) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 7. Шаблоны и Документы
        await client.query(`
            CREATE TABLE IF NOT EXISTS message_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id),
                name VARCHAR(255) NOT NULL,
                file_url TEXT,
                type VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS document_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                file_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 8. Права доступа (Permissions)
        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                resource VARCHAR(100) NOT NULL,
                action VARCHAR(100) NOT NULL,
                description TEXT,
                UNIQUE(resource, action)
            );

            CREATE TABLE IF NOT EXISTS role_permissions (
                id SERIAL PRIMARY KEY,
                role VARCHAR(50) NOT NULL,
                permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
                UNIQUE(role, permission_id)
            );

            CREATE TABLE IF NOT EXISTS user_permissions (
                id SERIAL PRIMARY KEY,
                manager_id INTEGER NOT NULL,
                permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
                granted BOOLEAN DEFAULT TRUE,
                UNIQUE(manager_id, permission_id)
            );
        `);

        // Заполнение базовых прав доступа
        await client.query(`
            INSERT INTO permissions (resource, action, description) VALUES
            ('leads', 'view', 'Просмотр лидов'),
            ('leads', 'create', 'Создание лидов'),
            ('leads', 'edit', 'Редактирование лидов'),
            ('leads', 'delete', 'Удаление лидов'),
            ('students', 'view', 'Просмотр студентов'),
            ('analytics', 'view', 'Просмотр аналитики'),
            ('settings', 'view', 'Просмотр настроек')
            ON CONFLICT DO NOTHING;
        `);

        // 9. Тикеты
        await client.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                user_id BIGINT,
                subject VARCHAR(255),
                message TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query('COMMIT');
        console.log('✅ [Init CRM] All tables created and initialized');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ [Init CRM] Failed to initialize database:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function down() {
    // Вниз не удаляем таблицы, чтобы не потерять данные случайно
}
