# Следующие шаги реализации

## ✅ Выполнено (Этап 1)

1. **Формы создания в веб-интерфейсе**:
   - ✅ Форма создания рассылок
   - ✅ Форма создания розыгрышей
   - ✅ Форма создания автоворонок
   - ✅ Форма создания лид-магнитов

## ⏳ Следующие этапы

### Этап 2: Система чата/тикетов

#### 2.1 База данных
Нужно добавить в `init.sql`:

```sql
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

CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_manager_id ON tickets(manager_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
```

#### 2.2 Backend API
Создать `crm-backend/routes/tickets.js`:
- `GET /api/tickets` - список тикетов (с фильтрацией по менеджеру, статусу)
- `GET /api/tickets/:id` - детали тикета с сообщениями
- `POST /api/tickets` - создать тикет
- `POST /api/tickets/:id/messages` - отправить сообщение
- `PUT /api/tickets/:id` - обновить статус тикета
- Интеграция с Telegram ботом

#### 2.3 Frontend
Создать `crm-frontend/src/pages/Chat.jsx`:
- Список тикетов с фильтрами
- Страница деталей тикета с перепиской
- Возможность создать тикет из карточки лида
- Возможность начать диалог с пользователем

#### 2.4 Telegram Bot
Добавить в бот:
- Команда `/ticket` для создания тикета пользователем
- Обработка сообщений в тикетах
- Отправка сообщений от менеджера пользователю

### Этап 3: Система прав доступа

#### 3.1 База данных
Добавить в `init.sql`:

```sql
-- Таблица прав доступа
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL, -- 'leads', 'students', 'deals', etc.
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

CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_user_permissions_manager_id ON user_permissions(manager_id);
```

#### 3.2 Backend API
Создать `crm-backend/routes/permissions.js`:
- `GET /api/permissions` - список всех прав
- `GET /api/permissions/roles/:role` - права роли
- `PUT /api/permissions/roles/:role` - обновить права роли
- `GET /api/permissions/users/:userId` - права пользователя
- `PUT /api/permissions/users/:userId` - обновить права пользователя
- Middleware для проверки прав

#### 3.3 Frontend
Создать `crm-frontend/src/pages/Permissions.jsx`:
- Вкладка "Права по ролям"
- Вкладка "Права по пользователям"
- Чекбоксы для каждого права в каждом разделе

## Приоритет реализации

1. **Сначала**: Система чата/тикетов (основной функционал для работы)
2. **Затем**: Система прав доступа (безопасность и контроль)

## Команды для применения

После реализации каждого этапа:

```bash
cd /opt/AlexandrLid
git pull
# Применить миграцию БД
docker compose cp init.sql postgres:/tmp/
docker compose exec -T postgres psql -U postgres -d telegram_bot_db -f /tmp/init.sql
# Пересобрать и перезапустить
docker compose build --no-cache
docker compose restart
```

