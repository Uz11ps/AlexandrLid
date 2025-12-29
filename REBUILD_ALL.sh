#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода ошибок
error() {
    echo -e "${RED}❌ Ошибка: $1${NC}" >&2
    exit 1
}

# Функция для вывода успеха
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Функция для вывода информации
info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Функция для вывода предупреждения
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "=== Полная пересборка всего проекта ==="

# Проверка директории
if [ ! -f "docker-compose.yml" ]; then
    error "Файл docker-compose.yml не найден. Убедитесь, что вы находитесь в корне проекта."
fi

# 1. Остановка всех контейнеров
info "Остановка всех контейнеров..."
docker compose down -v

# 2. Удаление старых контейнеров
info "Удаление старых контейнеров и очистка кэша..."
docker compose rm -f
docker builder prune -f

# 3. Обновление кода
info "Обновление кода из репозитория..."
git pull

# 4. Пересборка сервисов
info "Полная пересборка всех сервисов..."
if ! docker compose build --no-cache --pull; then
    error "Не удалось пересобрать сервисы"
fi

# 5. Запуск всех сервисов
info "Запуск всех сервисов..."
# Принудительно загружаем .env в окружение текущего shell для docker compose
set -a
[ -f .env ] && . ./.env
set +a

# Извлекаем DB_PASSWORD из .env для использования в docker-compose.yml
DB_PASS_FOR_COMPOSE=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS_FOR_COMPOSE" ]; then
    DB_PASS_FOR_COMPOSE="postgres"
fi

# Проверяем, что DB_PASSWORD установлен
if [ -z "$DB_PASSWORD" ]; then
    info "DB_PASSWORD не найден в .env, используем 'postgres'"
    export DB_PASSWORD="$DB_PASS_FOR_COMPOSE"
else
    info "DB_PASSWORD найден: [${#DB_PASSWORD} символов]"
fi

# Явно экспортируем DB_PASSWORD для docker-compose.yml
export DB_PASSWORD="$DB_PASS_FOR_COMPOSE"
info "Экспортирован DB_PASSWORD для docker-compose.yml: [${#DB_PASSWORD} символов]"

if ! docker compose up -d; then
    error "Не удалось запустить сервисы"
fi

# 6. Ожидание готовности PostgreSQL
info "Ожидание готовности PostgreSQL..."
for i in {1..30}; do
    if docker compose exec -T telegram_db_alex pg_isready -U postgres > /dev/null 2>&1; then
        success "PostgreSQL готов"
        break
    fi
    if [ $i -eq 30 ]; then
        error "PostgreSQL не готов после 30 попыток"
    fi
    sleep 1
done

# 6.5. Проверка и синхронизация пароля базы данных
info "Проверка пароля базы данных..."
DB_PASS_FROM_ENV=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS_FROM_ENV" ]; then
    DB_PASS_FROM_ENV="postgres"
fi
info "Пароль из .env: [${#DB_PASS_FROM_ENV} символов]"

# Пробуем подключиться с паролем из .env
if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
    success "Пароль из .env работает!"
else
    info "Пароль из .env не работает, пробуем стандартный 'postgres'..."
    if docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        info "Стандартный пароль 'postgres' работает. Синхронизируем пароль из .env..."
        WORKING_PASSWORD="postgres"
    else
        error "Не удалось подключиться ни с одним паролем!"
    fi
fi

# ПРИНУДИТЕЛЬНАЯ синхронизация пароля из .env в базу данных
# Это гарантирует, что база использует тот же пароль, что и приложение
info "Принудительная синхронизация пароля в базе данных..."
WORKING_PASSWORD="${WORKING_PASSWORD:-$DB_PASS_FROM_ENV}"

# Устанавливаем пароль через ALTER USER (экранируем специальные символы)
info "Установка пароля через ALTER USER..."
# Используем одинарные кавычки для экранирования пароля в SQL
SQL_PASSWORD=$(echo "$DB_PASS_FROM_ENV" | sed "s/'/''/g")  # Экранируем одинарные кавычки для SQL
if docker compose exec -T -e PGPASSWORD="$WORKING_PASSWORD" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
    success "Команда ALTER USER выполнена!"
else
    warning "Команда ALTER USER завершилась с ошибкой, но продолжаем..."
fi

# Проверяем пароль сразу (без перезапуска базы)
info "Проверка пароля сразу после установки..."
sleep 2

# Пробуем подключиться с новым паролем несколько раз
MAX_RETRIES=3
RETRY_COUNT=0
PASSWORD_WORKS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        success "Проверка #$((RETRY_COUNT+1)): пароль работает!"
        PASSWORD_WORKS=true
        break
    else
        info "Проверка #$((RETRY_COUNT+1)): пароль не работает, ждем..."
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

if [ "$PASSWORD_WORKS" = false ]; then
    warning "Пароль не работает сразу. Пробуем перезапустить базу..."
    docker compose restart telegram_db_alex
    sleep 5
    
    # Ждем готовности базы
    for i in {1..10}; do
        if docker compose exec -T -u postgres telegram_db_alex pg_isready > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Финальная проверка после перезапуска
    if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        success "После перезапуска: пароль работает!"
    else
        error "КРИТИЧНО: Пароль не работает даже после перезапуска базы!"
        error "Проверьте, что пароль в .env совпадает с POSTGRES_PASSWORD в docker-compose.yml"
    fi
fi

# 7. Проверка прав доступа
info "Проверка прав доступа..."
docker compose exec -T -e PGPASSWORD="${DB_PASS_FROM_ENV:-postgres}" telegram_db_alex psql -U postgres -d telegram_bot_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;" > /dev/null 2>&1 || true

# 7.5. Проверка переменных окружения в контейнере бота
info "Проверка переменных окружения в контейнере бота..."
BOT_DB_PASS=$(docker compose exec -T bot printenv DB_PASSWORD 2>/dev/null | tr -d '\r' || echo "")
BOT_DB_HOST=$(docker compose exec -T bot printenv DB_HOST 2>/dev/null | tr -d '\r' || echo "")
if [ -n "$BOT_DB_PASS" ]; then
    info "Бот видит DB_PASSWORD: [${#BOT_DB_PASS} символов]"
    if [ "$BOT_DB_PASS" != "$DB_PASS_FROM_ENV" ]; then
        warning "НЕСООТВЕТСТВИЕ: Бот видит пароль длиной ${#BOT_DB_PASS}, а в .env пароль длиной ${#DB_PASS_FROM_ENV}!"
    else
        success "Пароль в контейнере бота совпадает с .env!"
    fi
else
    warning "Бот НЕ видит DB_PASSWORD в окружении!"
fi
if [ -n "$BOT_DB_HOST" ]; then
    info "Бот видит DB_HOST: $BOT_DB_HOST"
else
    warning "Бот НЕ видит DB_HOST в окружении!"
fi

# 7.6. Проверка фактического пароля в базе данных
info "Проверка фактического пароля в базе данных..."
# Пробуем подключиться с паролем из .env и проверить, можем ли мы выполнить запрос
if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    success "Фактический пароль в БД совпадает с .env!"
else
    warning "Фактический пароль в БД НЕ совпадает с .env!"
    info "Пробуем подключиться с паролем 'postgres'..."
    if docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        warning "База использует пароль 'postgres', а не пароль из .env!"
        info "Повторная синхронизация пароля..."
        # Экранируем пароль для SQL
        SQL_PASSWORD=$(echo "$DB_PASS_FROM_ENV" | sed "s/'/''/g")
        docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1
        sleep 2
        # Проверяем несколько раз
        for i in {1..3}; do
            if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
                success "Пароль синхронизирован повторно (попытка #$i)!"
                break
            else
                info "Попытка #$i: пароль еще не применился, ждем..."
                sleep 2
            fi
        done
    else
        error "Не удалось подключиться даже с паролем 'postgres'!"
    fi
fi

# 7.7. Проверка и исправление pg_hba.conf
info "Проверка pg_hba.conf для разрешения подключений из Docker сети..."
# Проверяем, есть ли правила для подключений из сети Docker
PG_HBA_CHECK=$(docker compose exec -T telegram_db_alex cat /var/lib/postgresql/data/pg_hba.conf 2>/dev/null | grep -E "host.*all.*all.*0\.0\.0\.0/0|host.*all.*all.*::/0" || echo "")
if [ -z "$PG_HBA_CHECK" ]; then
    warning "pg_hba.conf не содержит правил для подключений из Docker сети. Добавляем..."
    # Добавляем правила в pg_hba.conf
    docker compose exec -T telegram_db_alex sh -c "echo 'host    all             all             0.0.0.0/0               scram-sha-256' >> /var/lib/postgresql/data/pg_hba.conf"
    docker compose exec -T telegram_db_alex sh -c "echo 'host    all             all             ::/0                    scram-sha-256' >> /var/lib/postgresql/data/pg_hba.conf"
    # Перезагружаем конфигурацию PostgreSQL
    docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1
    success "pg_hba.conf обновлен!"
    sleep 2
else
    success "pg_hba.conf уже настроен правильно"
fi

# 7.8. Проверка подключения из контейнера бота
info "Проверка подключения к БД из контейнера бота..."
# Устанавливаем psql в контейнер бота (если его нет) и проверяем подключение
BOT_CONNECTION_TEST=$(docker compose exec -T bot sh -c "command -v psql > /dev/null 2>&1 || apk add --no-cache postgresql-client > /dev/null 2>&1; PGPASSWORD=\"$DB_PASS_FROM_ENV\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;' 2>&1" 2>&1)
if echo "$BOT_CONNECTION_TEST" | grep -q "password authentication failed"; then
    warning "Бот НЕ может подключиться с паролем из .env!"
    info "Ошибка подключения: $(echo "$BOT_CONNECTION_TEST" | head -n 1)"
    info "Проверяем сетевую доступность..."
    # Проверяем, может ли контейнер бота достичь контейнера базы данных
    if docker compose exec -T bot ping -c 1 telegram_db_alex > /dev/null 2>&1; then
        success "Сетевая доступность: OK (ping работает)"
    else
        warning "Сетевая доступность: ПРОБЛЕМА (ping не работает)"
    fi
    # Проверяем, может ли контейнер бота подключиться к порту 5432
    if docker compose exec -T bot nc -z telegram_db_alex 5432 > /dev/null 2>&1; then
        success "Порт 5432 доступен из контейнера бота"
    else
        warning "Порт 5432 НЕ доступен из контейнера бота!"
    fi
    info "Пробуем с паролем 'postgres'..."
    BOT_CONNECTION_TEST_POSTGRES=$(docker compose exec -T bot sh -c "PGPASSWORD=\"postgres\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;' 2>&1" 2>&1)
    if echo "$BOT_CONNECTION_TEST_POSTGRES" | grep -q "password authentication failed"; then
        error "Бот НЕ может подключиться даже с паролем 'postgres'!"
        error "Ошибка: $(echo "$BOT_CONNECTION_TEST_POSTGRES" | head -n 1)"
    else
        warning "Бот может подключиться только с паролем 'postgres'!"
        info "Синхронизируем пароль в базе данных..."
        SQL_PASSWORD=$(echo "$DB_PASS_FROM_ENV" | sed "s/'/''/g")
        docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1
        sleep 2
        if docker compose exec -T bot sh -c "PGPASSWORD=\"$DB_PASS_FROM_ENV\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;' > /dev/null 2>&1" 2>/dev/null; then
            success "После синхронизации: бот может подключиться!"
        fi
    fi
elif echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
    success "Бот может подключиться к БД из своего контейнера!"
else
    warning "Неожиданный результат проверки подключения бота: $BOT_CONNECTION_TEST"
fi

# 7.6. Перезапуск бота и бэкенда для применения правильного пароля
info "Перезапуск бота и бэкенда для применения настроек..."
docker compose restart bot crm-backend
sleep 3

# 7.7. Добавление недостающих колонок напрямую через psql
info "Добавление недостающих колонок напрямую через psql..."
# Пробуем подключиться с паролем из .env
if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(10) DEFAULT 'RUB';" > /dev/null 2>&1; then
    success "Колонка students.payment_currency добавлена"
else
    warning "Не удалось добавить students.payment_currency (возможно, уже существует)"
fi

if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);" > /dev/null 2>&1; then
    success "Колонка students.payment_method добавлена"
else
    warning "Не удалось добавить students.payment_method (возможно, уже существует)"
fi

if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;" > /dev/null 2>&1; then
    success "Колонка message_templates.is_active добавлена"
else
    warning "Не удалось добавить message_templates.is_active (возможно, уже существует)"
fi

if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "ALTER TABLE documents ADD COLUMN IF NOT EXISTS created_by INTEGER;" > /dev/null 2>&1; then
    success "Колонка documents.created_by добавлена"
else
    warning "Не удалось добавить documents.created_by (возможно, уже существует)"
fi

if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "ALTER TABLE documents ADD COLUMN IF NOT EXISTS lead_id INTEGER;" > /dev/null 2>&1; then
    success "Колонка documents.lead_id добавлена"
else
    warning "Не удалось добавить documents.lead_id (возможно, уже существует)"
fi

if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;" > /dev/null 2>&1; then
    success "Колонка courses.updated_at добавлена"
else
    warning "Не удалось добавить courses.updated_at (возможно, уже существует)"
fi

# Создаем таблицу ticket_messages, если она не существует
if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "CREATE TABLE IF NOT EXISTS ticket_messages (id SERIAL PRIMARY KEY, ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE, manager_id INTEGER REFERENCES managers(id) ON DELETE SET NULL, message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" > /dev/null 2>&1; then
    success "Таблица ticket_messages создана/проверена"
else
    warning "Не удалось создать ticket_messages (возможно, уже существует или есть ошибки зависимостей)"
fi

# 8. Создание администратора
info "Создание администратора..."
# Даем время на окончательный старт бэкенда
sleep 5
docker compose exec -T crm-backend node scripts/create-admin.js "123@mail.ru" "123" "Administrator"

success "=== ГОТОВО! ==="
echo "Попробуйте написать боту /start"
