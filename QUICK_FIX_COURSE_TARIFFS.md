# Быстрое исправление: Таблица course_tariffs

## Проблема
Ошибка 503: "Таблица course_tariffs не существует"

## Решение

### Автоматическое решение (рекомендуется)

Таблица будет создана автоматически при следующем перезапуске backend сервера.

**Что нужно сделать:**

1. **Перезапустите backend сервер:**
   
   Если используется Docker:
   ```bash
   docker compose restart crm-backend
   ```
   
   Если используется PM2:
   ```bash
   pm2 restart crm-backend
   ```
   
   Если используется systemd:
   ```bash
   sudo systemctl restart crm-backend
   ```

2. **Проверьте логи** - вы должны увидеть сообщения:
   ```
   🔄 Running database migrations...
   Creating course_tariffs table...
   ✅ Table course_tariffs created successfully
   ✅ Migrations completed
   🚀 CRM Backend server running on port 3001
   ```

3. **Проверьте работу** - попробуйте создать тариф снова

### Ручное решение (если автоматическое не сработало)

Если автоматическая миграция не сработала, выполните SQL скрипт вручную:

```bash
# Подключитесь к базе данных
psql -U your_db_user -d your_db_name

# Выполните SQL
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

CREATE INDEX IF NOT EXISTS idx_course_tariffs_course_id ON course_tariffs(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tariffs_order ON course_tariffs(order_index);
CREATE INDEX IF NOT EXISTS idx_course_tariffs_is_active ON course_tariffs(is_active);
```

## Проверка

После перезапуска проверьте, что таблица создана:

```sql
SELECT * FROM course_tariffs LIMIT 1;
```

Если запрос выполняется без ошибок - таблица создана успешно!

