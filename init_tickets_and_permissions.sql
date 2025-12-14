-- ============================================
-- МИГРАЦИЯ: Система тикетов и прав доступа
-- ============================================

-- Таблица тикетов
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'resolved')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

-- Таблица сообщений в тикетах
CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('user', 'manager', 'admin')),
    sender_id BIGINT NOT NULL, -- user_id или manager_id в зависимости от sender_type
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Индексы для тикетов
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_manager_id ON tickets(manager_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);

-- ============================================
-- Система прав доступа
-- ============================================

-- Таблица прав доступа
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL, -- 'leads', 'students', 'deals', 'products', 'tasks', 'analytics', 'templates', 'documents', 'bot_admin', 'chat', 'permissions'
    action VARCHAR(50) NOT NULL, -- 'read', 'create', 'update', 'delete'
    description TEXT,
    UNIQUE(resource, action)
);

-- Права по ролям
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role, permission_id)
);

-- Права по пользователям (переопределение прав роли)
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    manager_id INTEGER NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE, -- true = разрешено, false = запрещено
    UNIQUE(manager_id, permission_id)
);

-- Индексы для прав
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_manager_id ON user_permissions(manager_id);

-- ============================================
-- Заполнение базовых прав
-- ============================================

-- Список всех ресурсов и действий
INSERT INTO permissions (resource, action, description) VALUES
-- Лиды
('leads', 'read', 'Просмотр лидов'),
('leads', 'create', 'Создание лидов'),
('leads', 'update', 'Редактирование лидов'),
('leads', 'delete', 'Удаление лидов'),
-- Студенты
('students', 'read', 'Просмотр студентов'),
('students', 'create', 'Создание студентов'),
('students', 'update', 'Редактирование студентов'),
('students', 'delete', 'Удаление студентов'),
-- Сделки
('deals', 'read', 'Просмотр сделок'),
('deals', 'create', 'Создание сделок'),
('deals', 'update', 'Редактирование сделок'),
('deals', 'delete', 'Удаление сделок'),
-- Продукты
('products', 'read', 'Просмотр продуктов'),
('products', 'create', 'Создание продуктов'),
('products', 'update', 'Редактирование продуктов'),
('products', 'delete', 'Удаление продуктов'),
-- Задачи
('tasks', 'read', 'Просмотр задач'),
('tasks', 'create', 'Создание задач'),
('tasks', 'update', 'Редактирование задач'),
('tasks', 'delete', 'Удаление задач'),
-- Аналитика
('analytics', 'read', 'Просмотр аналитики'),
-- Шаблоны
('templates', 'read', 'Просмотр шаблонов'),
('templates', 'create', 'Создание шаблонов'),
('templates', 'update', 'Редактирование шаблонов'),
('templates', 'delete', 'Удаление шаблонов'),
-- Документы
('documents', 'read', 'Просмотр документов'),
('documents', 'create', 'Создание документов'),
('documents', 'update', 'Редактирование документов'),
('documents', 'delete', 'Удаление документов'),
-- Админка бота
('bot_admin', 'read', 'Просмотр админки бота'),
('bot_admin', 'create', 'Создание элементов админки'),
('bot_admin', 'update', 'Редактирование элементов админки'),
('bot_admin', 'delete', 'Удаление элементов админки'),
-- Чат
('chat', 'read', 'Просмотр чатов'),
('chat', 'create', 'Создание тикетов'),
('chat', 'update', 'Редактирование тикетов'),
('chat', 'delete', 'Удаление тикетов'),
-- Права доступа
('permissions', 'read', 'Просмотр прав'),
('permissions', 'update', 'Редактирование прав')
ON CONFLICT (resource, action) DO NOTHING;

-- Права по умолчанию для роли admin (все права)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Права по умолчанию для роли manager
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions
WHERE resource IN ('leads', 'students', 'deals', 'tasks', 'chat', 'templates', 'documents')
  AND action IN ('read', 'create', 'update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Права по умолчанию для роли marketer
INSERT INTO role_permissions (role, permission_id)
SELECT 'marketer', id FROM permissions
WHERE resource IN ('leads', 'analytics', 'templates', 'bot_admin')
  AND action IN ('read', 'create', 'update')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Права по умолчанию для роли accountant
INSERT INTO role_permissions (role, permission_id)
SELECT 'accountant', id FROM permissions
WHERE resource IN ('students', 'deals', 'analytics')
  AND action = 'read'
ON CONFLICT (role, permission_id) DO NOTHING;

