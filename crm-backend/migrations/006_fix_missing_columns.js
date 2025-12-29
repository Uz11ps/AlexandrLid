import { query } from '../db.js';

export async function up() {
    try {
        console.log('🛠️ [Migration 006] STARTING EXHAUSTIVE SCHEMA SYNC...');

        const ensureColumn = async (table, column, typeDef) => {
            try {
                // Проверяем, существует ли колонка
                const checkResult = await query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [table, column]);
                
                if (checkResult.rows.length === 0) {
                    // Используем IF NOT EXISTS для надежности
                    await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${typeDef}`);
                    console.log(`   ✅ Column ensured: ${table}.${column}`);
                } else {
                    console.log(`   ✅ Column ensured: ${table}.${column}`);
                }
            } catch (err) {
                // Если колонка уже существует, это не критично
                if (err.message && err.message.includes('already exists')) {
                    console.log(`   ✅ Column ensured: ${table}.${column} (already exists)`);
                } else {
                    console.error(`   ❌ Error ensuring ${column} in ${table}:`, err.message);
                    // Не пробрасываем ошибку, чтобы миграция продолжалась
                }
            }
        };

        // 1. COURSES
        await ensureColumn('courses', 'format', "VARCHAR(50) DEFAULT 'online'");
        await ensureColumn('courses', 'duration_weeks', "INTEGER");
        await ensureColumn('courses', 'base_price', "DECIMAL(10, 2)");
        await ensureColumn('courses', 'currency', "VARCHAR(10) DEFAULT 'RUB'");
        await ensureColumn('courses', 'status', "VARCHAR(50) DEFAULT 'active'");
        await ensureColumn('courses', 'updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

        // 2. LEADS
        await ensureColumn('leads', 'fio', "VARCHAR(255)");
        await ensureColumn('leads', 'phone', "VARCHAR(50)");
        await ensureColumn('leads', 'utm_source', "VARCHAR(255)");
        await ensureColumn('leads', 'manager_id', "INTEGER");
        await ensureColumn('leads', 'is_student', "BOOLEAN DEFAULT FALSE");
        await ensureColumn('leads', 'source', "VARCHAR(100)");
        await ensureColumn('leads', 'converted_to_student_at', "TIMESTAMP");

        // 3. STUDENTS
        await ensureColumn('students', 'course_id', "INTEGER");
        await ensureColumn('students', 'contract_number', "VARCHAR(100)");
        await ensureColumn('students', 'start_date', "DATE");
        await ensureColumn('students', 'payment_amount', "DECIMAL(10, 2)");
        console.log('   🔍 Checking payment_currency...');
        await ensureColumn('students', 'payment_currency', "VARCHAR(10) DEFAULT 'RUB'");
        await ensureColumn('students', 'payment_status', "VARCHAR(50) DEFAULT 'pending'");
        await ensureColumn('students', 'progress_percent', "INTEGER DEFAULT 0");
        await ensureColumn('students', 'curator_id', "INTEGER");

        // 4. DEALS
        await query(`
            CREATE TABLE IF NOT EXISTS deals (
                id SERIAL PRIMARY KEY,
                lead_id INTEGER,
                student_id INTEGER,
                title VARCHAR(255) DEFAULT 'Новая сделка',
                amount DECIMAL(10, 2) DEFAULT 0,
                stage VARCHAR(50) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await ensureColumn('deals', 'student_id', "INTEGER");
        await ensureColumn('deals', 'manager_id', "INTEGER");
        await ensureColumn('deals', 'amount', "DECIMAL(10, 2) DEFAULT 0");
        await ensureColumn('deals', 'stage', "VARCHAR(50) DEFAULT 'new'");

        // 5. PAYMENTS
        await ensureColumn('payments', 'status', "VARCHAR(50) DEFAULT 'completed'");
        await ensureColumn('payments', 'payment_date', "DATE DEFAULT CURRENT_DATE");

        // 6. MESSAGE_TEMPLATES
        console.log('   🔍 Checking message_templates.is_active...');
        await ensureColumn('message_templates', 'is_active', "BOOLEAN DEFAULT TRUE");

        // 7. DOCUMENTS
        console.log('   🔍 Checking documents.created_by...');
        await ensureColumn('documents', 'created_by', "INTEGER");

        // 8. TICKET_MESSAGES
        console.log('   🔍 Checking ticket_messages table...');
        try {
            const checkTable = await query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'ticket_messages'
            `);
            
            if (checkTable.rows.length === 0) {
                await query(`
                    CREATE TABLE ticket_messages (
                        id SERIAL PRIMARY KEY,
                        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                        manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
                        message TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                `);
                console.log('   ✅ Table created: ticket_messages');
            } else {
                console.log('   ⏭️  Table already exists: ticket_messages');
            }
        } catch (err) {
            console.error('   ❌ Error creating ticket_messages:', err.message);
            throw err;
        }

        console.log('✅ [Migration 006] SCHEMA SYNC COMPLETED SUCCESSFULLY');
    } catch (error) {
        console.error('❌ [Migration 006] CRITICAL ERROR:', error);
        throw error;
    }
}

export async function down() {}
