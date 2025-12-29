#!/bin/bash

# Скрипт для диагностики и исправления проблем с подключением к базе данных

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "=== Диагностика и исправление подключения к БД ==="

# 1. Проверяем, что контейнеры запущены
info "Проверка запущенных контейнеров..."
if ! docker compose ps | grep -q "telegram_db_alex.*Up"; then
    error "Контейнер telegram_db_alex не запущен!"
    exit 1
fi
success "Контейнер базы данных запущен"

# 2. Извлекаем пароль из .env
info "Извлечение пароля из .env..."
DB_PASS_FROM_ENV=$(grep "^DB_PASSWORD=" .env 2>/dev/null | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS_FROM_ENV" ]; then
    DB_PASS_FROM_ENV="postgres"
    warning "DB_PASSWORD не найден в .env, используем 'postgres'"
fi
info "Пароль из .env: [${#DB_PASS_FROM_ENV} символов]"

# 3. Проверяем подключение из контейнера базы данных
info "Проверка подключения из контейнера базы данных..."
if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
    success "Подключение из контейнера БД работает с паролем из .env"
    WORKING_PASSWORD="$DB_PASS_FROM_ENV"
else
    warning "Подключение с паролем из .env не работает, пробуем 'postgres'..."
    if docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        success "Подключение работает с паролем 'postgres'"
        WORKING_PASSWORD="postgres"
    else
        error "Не удалось подключиться ни с одним паролем!"
        exit 1
    fi
fi

# 4. Синхронизируем пароль в базе данных
if [ "$WORKING_PASSWORD" != "$DB_PASS_FROM_ENV" ]; then
    info "Синхронизация пароля в базе данных..."
    SQL_PASSWORD=$(echo "$DB_PASS_FROM_ENV" | sed "s/'/''/g")
    if docker compose exec -T -e PGPASSWORD="$WORKING_PASSWORD" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
        success "Пароль установлен в базе данных"
        sleep 2
        
        # Проверяем, работает ли новый пароль
        if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
            success "Новый пароль работает!"
        else
            warning "Новый пароль еще не применился, перезапускаем базу..."
            docker compose restart telegram_db_alex
            sleep 5
            
            # Ждем готовности базы
            for i in {1..10}; do
                if docker compose exec -T telegram_db_alex pg_isready -U postgres > /dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            
            if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
                success "После перезапуска: пароль работает!"
            else
                error "Пароль не работает даже после перезапуска!"
            fi
        fi
    else
        error "Не удалось установить пароль!"
    fi
fi

# 5. Проверяем и исправляем pg_hba.conf
info "Проверка pg_hba.conf..."
PG_HBA_CONTENT=$(docker compose exec -T telegram_db_alex cat /var/lib/postgresql/data/pg_hba.conf 2>/dev/null)
if echo "$PG_HBA_CONTENT" | grep -qE "host.*all.*all.*0\.0\.0\.0/0.*scram-sha-256"; then
    success "pg_hba.conf настроен правильно"
else
    warning "pg_hba.conf не содержит правил для подключений из Docker сети. Исправляем..."
    
    # Создаем временный файл с правилами
    cat > /tmp/pg_hba_fix.conf << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             0.0.0.0/0               scram-sha-256
host    all             all             ::/0                    scram-sha-256
EOF
    
    # Копируем файл в контейнер
    docker cp /tmp/pg_hba_fix.conf telegram_bot_postgres:/tmp/pg_hba_fix.conf
    docker compose exec -T telegram_db_alex sh -c "cat /tmp/pg_hba_fix.conf >> /var/lib/postgresql/data/pg_hba.conf"
    
    # Перезагружаем конфигурацию
    docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || \
    docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1
    
    rm -f /tmp/pg_hba_fix.conf
    success "pg_hba.conf обновлен"
    sleep 2
fi

# 6. Проверяем подключение из контейнера бота
info "Проверка подключения из контейнера бота..."
# Устанавливаем postgresql-client если нужно
docker compose exec -T bot sh -c "apk add --no-cache postgresql-client > /dev/null 2>&1 || true" 2>&1 > /dev/null

BOT_CONNECTION_TEST=$(docker compose exec -T bot sh -c "PGPASSWORD=\"$DB_PASS_FROM_ENV\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;' 2>&1" 2>&1)
if echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
    success "Бот может подключиться к базе данных!"
elif echo "$BOT_CONNECTION_TEST" | grep -q "password authentication failed"; then
    error "Бот НЕ может подключиться: password authentication failed"
    error "Проверьте, что пароль в .env совпадает с паролем в базе данных"
    
    # Пробуем с паролем 'postgres'
    info "Пробуем подключиться с паролем 'postgres'..."
    BOT_CONNECTION_TEST_POSTGRES=$(docker compose exec -T bot sh -c "PGPASSWORD=\"postgres\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;' 2>&1" 2>&1)
    if echo "$BOT_CONNECTION_TEST_POSTGRES" | grep -q "1"; then
        warning "Бот может подключиться только с паролем 'postgres'!"
        warning "Синхронизируем пароль в базе данных..."
        SQL_PASSWORD=$(echo "$DB_PASS_FROM_ENV" | sed "s/'/''/g")
        docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1
        docker compose restart telegram_db_alex
        sleep 5
        
        # Ждем готовности базы
        for i in {1..10}; do
            if docker compose exec -T telegram_db_alex pg_isready -U postgres > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Проверяем снова
        BOT_CONNECTION_TEST_RETRY=$(docker compose exec -T bot sh -c "PGPASSWORD=\"$DB_PASS_FROM_ENV\" psql -h telegram_db_alex -U postgres -d telegram_bot_db -c 'SELECT 1;' 2>&1" 2>&1)
        if echo "$BOT_CONNECTION_TEST_RETRY" | grep -q "1"; then
            success "После синхронизации: бот может подключиться!"
        else
            error "После синхронизации: бот все еще не может подключиться!"
            error "Ошибка: $(echo "$BOT_CONNECTION_TEST_RETRY" | head -n 1)"
        fi
    else
        error "Бот не может подключиться даже с паролем 'postgres'!"
        error "Ошибка: $(echo "$BOT_CONNECTION_TEST_POSTGRES" | head -n 1)"
    fi
else
    warning "Неожиданный результат: $BOT_CONNECTION_TEST"
fi

# 7. Проверяем переменные окружения в контейнерах
info "Проверка переменных окружения..."
BOT_DB_PASS=$(docker compose exec -T bot printenv DB_PASSWORD 2>/dev/null | tr -d '\r' || echo "")
BOT_DB_HOST=$(docker compose exec -T bot printenv DB_HOST 2>/dev/null | tr -d '\r' || echo "")
BACKEND_DB_PASS=$(docker compose exec -T crm-backend printenv DB_PASSWORD 2>/dev/null | tr -d '\r' || echo "")
BACKEND_DB_HOST=$(docker compose exec -T crm-backend printenv DB_HOST 2>/dev/null | tr -d '\r' || echo "")

if [ -n "$BOT_DB_PASS" ]; then
    if [ "$BOT_DB_PASS" = "$DB_PASS_FROM_ENV" ]; then
        success "Бот видит правильный пароль"
    else
        warning "Бот видит пароль длиной ${#BOT_DB_PASS}, а в .env пароль длиной ${#DB_PASS_FROM_ENV}!"
    fi
else
    warning "Бот НЕ видит DB_PASSWORD!"
fi

if [ -n "$BACKEND_DB_PASS" ]; then
    if [ "$BACKEND_DB_PASS" = "$DB_PASS_FROM_ENV" ]; then
        success "Бэкенд видит правильный пароль"
    else
        warning "Бэкенд видит пароль длиной ${#BACKEND_DB_PASS}, а в .env пароль длиной ${#DB_PASS_FROM_ENV}!"
    fi
else
    warning "Бэкенд НЕ видит DB_PASSWORD!"
fi

# 8. Перезапускаем сервисы для применения изменений
info "Перезапуск сервисов..."
docker compose restart bot crm-backend
sleep 3

success "=== Диагностика завершена ==="
info "Проверьте логи:"
info "  docker compose logs bot --tail 50 -f"
info "  docker compose logs crm-backend --tail 50 -f"

