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
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // Фикс для лидов (проверка критических колонок)
        await client.query(`
            ALTER TABLE leads 
            ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS converted_to_student_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
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

