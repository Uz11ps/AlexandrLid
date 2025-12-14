# Инструкция по применению расширенной схемы БД для CRM

## Шаги для применения миграции:

### 1. На сервере выполните:

```bash
cd /opt/AlexandrLid

# Скачайте обновления
git pull

# Примените расширенную схему БД
docker compose exec postgres psql -U postgres -d telegram_bot_db -f /docker-entrypoint-initdb.d/init_crm_extended.sql

# Или если файл уже есть локально:
docker compose exec postgres psql -U postgres -d telegram_bot_db < init_crm_extended.sql
```

### 2. Альтернативный способ (если файл не в контейнере):

```bash
# Скопируйте файл в контейнер
docker compose cp init_crm_extended.sql postgres:/tmp/

# Примените миграцию
docker compose exec postgres psql -U postgres -d telegram_bot_db -f /tmp/init_crm_extended.sql
```

### 3. Проверка применения:

```bash
# Проверьте, что таблицы созданы
docker compose exec postgres psql -U postgres -d telegram_bot_db -c "\dt"

# Должны появиться новые таблицы:
# - funnel_stages
# - students
# - courses
# - packages
# - additional_services
# - deals
# - payments
# - debts
# - study_groups
# - documents
# - document_templates
# - message_templates
# - objection_responses
# - files
```

### 4. Перезапуск сервисов:

```bash
docker compose restart crm-backend
```

## Важно:

- Миграция безопасна для существующих данных
- Стандартные этапы воронки будут созданы автоматически
- Существующие лиды не будут затронуты

