# Инструкция по созданию таблицы course_tariffs

## Проблема

При попытке открыть страницу курса возникает ошибка:
```
relation "course_tariffs" does not exist
```

Это означает, что таблица `course_tariffs` не создана в базе данных.

## Решение

### Вариант 1: Через psql (рекомендуется)

1. Подключитесь к серверу по SSH:
   ```bash
   ssh user@momentumtrading.ru
   ```

2. Подключитесь к базе данных PostgreSQL:
   ```bash
   psql -U your_db_user -d your_db_name
   ```
   
   Или если используется Docker:
   ```bash
   docker exec -it <postgres_container_name> psql -U postgres -d your_db_name
   ```

3. Выполните SQL скрипт:
   ```sql
   \i /path/to/create_course_tariffs_table.sql
   ```
   
   Или скопируйте содержимое файла `create_course_tariffs_table.sql` и выполните его в psql.

### Вариант 2: Через ISPmanager

1. Войдите в панель управления ISPmanager
2. Перейдите в раздел "Базы данных" → "PostgreSQL"
3. Выберите базу данных проекта
4. Откройте "SQL-запросы" или "phpPgAdmin"
5. Скопируйте содержимое файла `create_course_tariffs_table.sql`
6. Выполните SQL запрос

### Вариант 3: Через Docker (если используется)

```bash
# Найти контейнер PostgreSQL
docker ps | grep postgres

# Выполнить SQL скрипт
docker exec -i <postgres_container_name> psql -U postgres -d your_db_name < create_course_tariffs_table.sql
```

### Вариант 4: Прямое выполнение SQL

Если у вас есть доступ к базе данных, выполните следующие команды:

```sql
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
```

## Проверка

После выполнения скрипта проверьте, что таблица создана:

```sql
SELECT * FROM course_tariffs LIMIT 1;
```

Если запрос выполняется без ошибок, таблица создана успешно.

## Дополнительно

Если таблица `courses` также не существует, скрипт `create_course_tariffs_table.sql` создаст её автоматически.

Также скрипт добавит колонки `author` и `cover_image` в таблицу `courses`, если их нет.

## После выполнения

1. Перезапустите backend приложение (если необходимо)
2. Обновите страницу курса в браузере
3. Проверьте, что ошибка исчезла

