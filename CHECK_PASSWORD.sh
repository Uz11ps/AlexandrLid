#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ Ошибка: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

echo "=== Проверка пароля базы данных ==="

# Получаем пароль из .env
DB_PASS_FROM_ENV=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS_FROM_ENV" ]; then
    DB_PASS_FROM_ENV="postgres"
fi

info "Пароль из .env: [${#DB_PASS_FROM_ENV} символов]"

# Список паролей для проверки
PASSWORDS=("$DB_PASS_FROM_ENV" "postgres" "" "password" "admin" "root")

info "Проверка подключения с разными паролями..."

WORKING_PASSWORD=""
for pass in "${PASSWORDS[@]}"; do
    if [ -z "$pass" ]; then
        info "Проверка пустого пароля..."
    else
        info "Проверка пароля: [${#pass} символов]"
    fi
    
    if docker compose exec -T -e PGPASSWORD="$pass" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        success "Пароль работает! Длина: ${#pass}"
        WORKING_PASSWORD="$pass"
        break
    else
        info "Пароль не работает"
    fi
done

if [ -z "$WORKING_PASSWORD" ]; then
    error "Ни один пароль не работает!"
    exit 1
fi

success "Рабочий пароль найден: [${#WORKING_PASSWORD} символов]"

# Проверка переменных окружения в контейнере бота
info "Проверка переменных окружения в контейнере бота..."
BOT_DB_PASS=$(docker compose exec -T bot printenv DB_PASSWORD 2>/dev/null | tr -d '\r' || echo "")
if [ -n "$BOT_DB_PASS" ]; then
    info "Бот видит DB_PASSWORD: [${#BOT_DB_PASS} символов]"
    if [ "$BOT_DB_PASS" = "$WORKING_PASSWORD" ]; then
        success "Пароль в контейнере бота совпадает с рабочим паролем!"
    else
        error "Пароль в контейнере бота НЕ совпадает с рабочим паролем!"
        info "Ожидалось: [${#WORKING_PASSWORD} символов], Получено: [${#BOT_DB_PASS} символов]"
    fi
else
    error "Бот НЕ видит DB_PASSWORD в окружении!"
fi

# Проверка подключения из контейнера бота
info "Проверка подключения из контейнера бота..."
if docker compose exec -T bot sh -c "command -v psql > /dev/null 2>&1 || apk add --no-cache postgresql-client > /dev/null 2>&1; PGPASSWORD=\"$WORKING_PASSWORD\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;'" > /dev/null 2>&1; then
    success "Бот может подключиться к БД с рабочим паролем!"
else
    error "Бот НЕ может подключиться к БД даже с рабочим паролем!"
fi

echo ""
info "Рекомендация:"
if [ "$WORKING_PASSWORD" != "$DB_PASS_FROM_ENV" ]; then
    info "Рабочий пароль отличается от пароля в .env!"
    info "Выполните: docker compose exec -e PGPASSWORD=\"$WORKING_PASSWORD\" telegram_db_alex psql -U postgres -d postgres -c \"ALTER USER postgres WITH PASSWORD '\$(echo $DB_PASS_FROM_ENV | sed \"s/'/''/g')\";\""
else
    success "Рабочий пароль совпадает с паролем в .env!"
fi

