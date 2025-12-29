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
if docker compose exec -T -e PGPASSWORD="$WORKING_PASSWORD" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASS_FROM_ENV';" > /dev/null 2>&1; then
    success "Пароль синхронизирован в базе данных!"
    # Перезапускаем базу для применения изменений
    info "Перезапуск базы данных для применения пароля..."
    docker compose restart telegram_db_alex
    sleep 5
    # Проверяем, что новый пароль работает
    if docker compose exec -T -e PGPASSWORD="$DB_PASS_FROM_ENV" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        success "Проверка: новый пароль работает!"
    else
        warning "Проверка: новый пароль не работает сразу после установки. Возможно, нужна дополнительная задержка."
        sleep 3
    fi
else
    warning "Не удалось установить пароль через ALTER USER. Возможно, база уже использует правильный пароль."
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
else
    warning "Бот НЕ видит DB_PASSWORD в окружении!"
fi
if [ -n "$BOT_DB_HOST" ]; then
    info "Бот видит DB_HOST: $BOT_DB_HOST"
else
    warning "Бот НЕ видит DB_HOST в окружении!"
fi

# 7.6. Перезапуск бота и бэкенда для применения правильного пароля
info "Перезапуск бота и бэкенда для применения настроек..."
docker compose restart bot crm-backend
sleep 3

# 8. Создание администратора
info "Создание администратора..."
# Даем время на окончательный старт бэкенда
sleep 5
docker compose exec -T crm-backend node scripts/create-admin.js "123@mail.ru" "123" "Administrator"

success "=== ГОТОВО! ==="
echo "Попробуйте написать боту /start"
