-- Расширенная схема БД для полного функционала CRM
-- Выполнить после init.sql

-- Таблица настраиваемой воронки продаж
CREATE TABLE IF NOT EXISTS funnel_stages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL,
    color VARCHAR(20) DEFAULT '#3498db',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_index)
);

-- Вставка стандартных этапов воронки
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

-- Таблица студентов (расширение leads)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
    contract_number VARCHAR(100),
    start_date DATE,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    payment_amount DECIMAL(10, 2),
    payment_currency VARCHAR(10) DEFAULT 'RUB',
    payment_method VARCHAR(50), -- крипта/фиат
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

-- Таблица курсов
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(50) CHECK (format IN ('online', 'offline', 'hybrid')),
    duration_weeks INTEGER,
    program_structure JSONB, -- Структура программы
    base_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'RUB',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive', 'draft')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица тарифных планов
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    duration_days INTEGER,
    features JSONB, -- Что входит (чек-лист)
    additional_services TEXT[],
    installment_available BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица дополнительных услуг
CREATE TABLE IF NOT EXISTS additional_services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'RUB',
    duration_hours INTEGER,
    service_type VARCHAR(100), -- консультация/разбор/сопровождение/доступ
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сделок
CREATE TABLE IF NOT EXISTS deals (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    product_id INTEGER, -- Может быть course_id или package_id
    product_type VARCHAR(50) CHECK (product_type IN ('course', 'package', 'service')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    stage VARCHAR(100) DEFAULT 'draft',
    probability_percent INTEGER DEFAULT 0 CHECK (probability_percent >= 0 AND probability_percent <= 100),
    expected_close_date DATE,
    actual_close_date DATE,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    source VARCHAR(255),
    payment_method VARCHAR(50),
    commission DECIMAL(10, 2),
    net_profit DECIMAL(10, 2),
    acquisition_cost DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
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

-- Таблица задолженностей
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

-- Таблица групп обучения
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

-- Таблица документов
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('contract', 'invoice', 'act', 'certificate', 'reference', 'other')),
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
    template_id INTEGER REFERENCES document_templates(id) ON DELETE SET NULL,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'archived')),
    signed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES managers(id) ON DELETE SET NULL
);

-- Таблица шаблонов документов
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    template_content TEXT NOT NULL, -- HTML или Markdown шаблон
    variables JSONB, -- Переменные для автозаполнения
    format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'docx', 'html')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица шаблонов сообщений
CREATE TABLE IF NOT EXISTS message_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('sales', 'education', 'support', 'objections')),
    template_text TEXT NOT NULL,
    variables JSONB, -- Переменные для подстановки
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES managers(id) ON DELETE SET NULL
);

-- Таблица библиотеки ответов на возражения
CREATE TABLE IF NOT EXISTS objection_responses (
    id SERIAL PRIMARY KEY,
    objection_type VARCHAR(255) NOT NULL,
    response_text TEXT NOT NULL,
    category VARCHAR(100),
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица файлов (для загрузки файлов к карточкам)
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('lead', 'student', 'deal', 'task', 'document')),
    entity_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    category VARCHAR(100),
    uploaded_by INTEGER REFERENCES managers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Расширение таблицы tasks для чек-листов
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB; -- Массив объектов {text: string, completed: boolean}
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_created_reason VARCHAR(255);

-- Расширение таблицы leads для студентов
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_to_student_at TIMESTAMP;

-- Индексы для новых таблиц
CREATE INDEX IF NOT EXISTS idx_funnel_stages_order ON funnel_stages(order_index);
CREATE INDEX IF NOT EXISTS idx_students_lead_id ON students(lead_id);
CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_manager_id ON deals(manager_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_deal_id ON payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_debts_student_id ON debts(student_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_documents_lead_id ON documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_files_entity ON files(entity_type, entity_id);

