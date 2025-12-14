-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referrer_id BIGINT,
    is_bot BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (referrer_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Таблица рефералов
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id BIGINT NOT NULL,
    referral_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (referral_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(referrer_id, referral_id)
);

-- Таблица лид-магнитов
CREATE TABLE IF NOT EXISTS lead_magnets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'link', 'file', 'combined')),
    text_content TEXT,
    link_url VARCHAR(500),
    file_id VARCHAR(255),
    file_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица настроек бота
CREATE TABLE IF NOT EXISTS bot_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица черного списка
CREATE TABLE IF NOT EXISTS blacklist (
    user_id BIGINT PRIMARY KEY,
    reason TEXT,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    banned_by BIGINT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Таблица рассылок
CREATE TABLE IF NOT EXISTS broadcasts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'video', 'document')),
    file_id VARCHAR(255),
    buttons JSONB,
    segment VARCHAR(100),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    sent_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица розыгрышей
CREATE TABLE IF NOT EXISTS giveaways (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prize_description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    min_referrals INTEGER DEFAULT 0,
    require_channel_subscription BOOLEAN DEFAULT FALSE,
    winner_count INTEGER DEFAULT 1,
    winner_selection_type VARCHAR(50) DEFAULT 'top' CHECK (winner_selection_type IN ('top', 'random', 'combined')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Таблица участников розыгрышей
CREATE TABLE IF NOT EXISTS giveaway_participants (
    id SERIAL PRIMARY KEY,
    giveaway_id INTEGER NOT NULL,
    user_id BIGINT NOT NULL,
    referral_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(giveaway_id, user_id)
);

-- Индексы для новых таблиц
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_at ON broadcasts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_giveaways_status ON giveaways(status);
CREATE INDEX IF NOT EXISTS idx_giveaway_participants_giveaway_id ON giveaway_participants(giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_participants_user_id ON giveaway_participants(user_id);

-- Таблица автоворонок
CREATE TABLE IF NOT EXISTS autofunnels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL CHECK (trigger_event IN ('registration', 'no_subscription', 'inactive', 'new_referral')),
    delay_hours INTEGER DEFAULT 0,
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'video', 'document')),
    file_id VARCHAR(255),
    buttons JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица отправленных сообщений автоворонки
CREATE TABLE IF NOT EXISTS autofunnel_sent (
    id SERIAL PRIMARY KEY,
    autofunnel_id INTEGER NOT NULL,
    user_id BIGINT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autofunnel_id) REFERENCES autofunnels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(autofunnel_id, user_id)
);

-- Таблица напоминаний о подписке
CREATE TABLE IF NOT EXISTS subscription_reminders (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    last_reminder_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_id ON referrals(referral_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_active ON lead_magnets(is_active);
CREATE INDEX IF NOT EXISTS idx_autofunnels_active ON autofunnels(is_active);
CREATE INDEX IF NOT EXISTS idx_autofunnels_trigger ON autofunnels(trigger_event);
CREATE INDEX IF NOT EXISTS idx_autofunnel_sent_user ON autofunnel_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_reminders_user ON subscription_reminders(user_id);

-- ============================================
-- CRM SYSTEM TABLES (Phase 1.0)
-- ============================================

-- Таблица менеджеров CRM (пользователи системы)
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'marketer', 'accountant')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Таблица лидов (расширенная информация о пользователях)
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE, -- Связь с Telegram ID из таблицы users
    fio VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    telegram_username VARCHAR(255),
    country VARCHAR(100),
    city VARCHAR(100),
    age INTEGER,
    source VARCHAR(255), -- Источник привлечения
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    referrer_id BIGINT REFERENCES leads(id) ON DELETE SET NULL, -- Реферер (если есть)
    trading_experience VARCHAR(50) CHECK (trading_experience IN ('новичок', 'есть опыт', 'продвинутый')),
    interested_course TEXT,
    budget VARCHAR(100),
    ready_to_start VARCHAR(50),
    preferred_contact VARCHAR(100),
    timezone VARCHAR(100),
    notes TEXT, -- Дополнительные заметки менеджера
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Новый лид', -- Статус лида
    funnel_stage VARCHAR(100) DEFAULT 'Новый лид', -- Этап воронки продаж
    manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL, -- Ответственный менеджер
    priority VARCHAR(50) DEFAULT 'холодный' CHECK (priority IN ('горячий', 'теплый', 'холодный')),
    tags TEXT[], -- Теги/метки (массив строк)
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Таблица комментариев к лидам
CREATE TABLE IF NOT EXISTS lead_comments (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Таблица задач и напоминаний
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) DEFAULT 'reminder' CHECK (task_type IN ('call', 'send_materials', 'presentation', 'objections', 'check_payment', 'check_homework', 'consultation', 'collect_feedback', 'reminder', 'custom')),
    due_date TIMESTAMP NOT NULL,
    due_time TIME,
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории взаимодействий с лидами
CREATE TABLE IF NOT EXISTS lead_interactions (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('call', 'telegram_message', 'email', 'meeting', 'note', 'status_change', 'stage_change')),
    interaction_data JSONB, -- Дополнительные данные взаимодействия
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Индексы для CRM таблиц
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_funnel_stage ON leads(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_leads_manager_id ON leads(manager_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_manager_id ON tasks(manager_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_created_at ON lead_interactions(created_at);

