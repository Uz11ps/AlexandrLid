-- Создание таблицы course_tariffs если её нет
-- Выполнить на сервере в базе данных проекта

-- Проверка существования таблицы courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
        -- Создаем таблицу courses если её нет
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
    END IF;
END $$;

-- Создание таблицы course_tariffs
CREATE TABLE IF NOT EXISTS course_tariffs (
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

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_course_tariffs_course_id ON course_tariffs(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tariffs_order ON course_tariffs(order_index);
CREATE INDEX IF NOT EXISTS idx_course_tariffs_is_active ON course_tariffs(is_active);

-- Добавление колонок в courses если их нет
DO $$
BEGIN
    -- Добавляем колонку author если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'courses' AND column_name = 'author') THEN
        ALTER TABLE courses ADD COLUMN author VARCHAR(255);
    END IF;
    
    -- Добавляем колонку cover_image если её нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'courses' AND column_name = 'cover_image') THEN
        ALTER TABLE courses ADD COLUMN cover_image VARCHAR(500);
    END IF;
END $$;

