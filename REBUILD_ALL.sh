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

# Проверка аргументов
FULL_REBUILD=true
if [ "$1" == "--quick" ] || [ "$1" == "-q" ]; then
    FULL_REBUILD=false
    info "Быстрая пересборка (без удаления образов и очистки кэша)"
fi

echo "=== Полная пересборка всего проекта ==="

# Проверка директории
if [ ! -f "docker-compose.yml" ]; then
    error "Файл docker-compose.yml не найден. Убедитесь, что вы находитесь в корне проекта."
fi

# 1. Остановка всех контейнеров
echo ""
echo "1. Остановка всех контейнеров и удаление локальных образов..."
if ! docker compose down --rmi local; then
    error "Не удалось остановить контейнеры"
fi
success "Контейнеры остановлены и образы удалены"

# 2. Удаление старых контейнеров (только при полной пересборке)
if [ "$FULL_REBUILD" = true ]; then
echo ""
    echo "2. Удаление старых контейнеров..."
docker compose rm -f
    success "Старые контейнеры удалены"
fi

# 3. Очистка кэша сборки (только при полной пересборке)
if [ "$FULL_REBUILD" = true ]; then
echo ""
echo "3. Очистка кэша сборки..."
docker builder prune -f
    success "Кэш сборки очищен"
fi

# 4. Обновление кода
echo ""
echo "4. Обновление кода из репозитория..."
if ! git pull; then
    error "Не удалось обновить код из репозитория"
fi
success "Код обновлен"

# 5. Пересборка сервисов
echo ""
if [ "$FULL_REBUILD" = true ]; then
    echo "5. Полная пересборка всех сервисов БЕЗ кэша (это займет время)..."
    BUILD_ARGS="--no-cache --pull"
else
    echo "5. Пересборка всех сервисов (с кэшем)..."
    BUILD_ARGS="--pull"
fi

if ! docker compose build $BUILD_ARGS; then
    error "Не удалось пересобрать сервисы"
fi
success "Сервисы пересобраны"

# 6. Запуск всех сервисов
echo ""
echo "6. Запуск всех сервисов..."
if ! docker compose up -d; then
    error "Не удалось запустить сервисы"
fi
success "Сервисы запущены"

# 7. Ожидание готовности
echo ""
echo "7. Ожидание готовности сервисов..."
sleep 10

# Проверка готовности PostgreSQL
echo "Проверка готовности PostgreSQL..."
for i in {1..30}; do
    if docker compose exec -T -u postgres postgres pg_isready > /dev/null 2>&1; then
        success "PostgreSQL готов"
        break
    fi
    if [ $i -eq 30 ]; then
        error "PostgreSQL не готов после 30 попыток"
    fi
    sleep 1
done

# Синхронизация пароля (на случай если в томе старый пароль)
info "Синхронизация пароля PostgreSQL..."
# Используем более точный поиск переменной
DB_PASS=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")

if [ -z "$DB_PASS" ]; then
    info "Предупреждение: DB_PASSWORD не найден в .env, используем 'postgres'"
    DB_PASS="postgres"
fi

info "Попытка установить пароль для пользователя postgres (длина: ${#DB_PASS})..."
if docker compose exec -T -u postgres postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';" ; then
    success "Пароль PostgreSQL успешно обновлен в базе"
else
    info "⚠️ Не удалось обновить пароль через ALTER USER. Попробуем другой метод..."
    # Попробуем через переменную окружения, если psql требует пароль
    docker compose exec -T -e PGPASSWORD=postgres -u postgres postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';" || info "Не удалось обновить пароль даже с PGPASSWORD=postgres"
fi
    
    info "Обновление прав доступа в базе данных..."
    docker compose exec -T -u postgres postgres psql -d telegram_bot_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;" > /dev/null
    success "Права доступа обновлены"

    info "Принудительная пересборка и пересоздание сервисов..."
    docker compose up -d --build --force-recreate bot crm-backend
    sleep 10

    info "Создание администратора по умолчанию (123@mail.ru / 123)..."
    docker compose exec -T crm-backend node scripts/create-admin.js "123@mail.ru" "123" "Administrator"
    success "Администратор проверен/создан"
else
    info "Предупреждение: Не удалось изменить пароль через psql (возможно, база еще инициализируется)"
fi

# Дополнительное ожидание для других сервисов
sleep 5

# 8. Проверка статуса
echo ""
echo "8. Статус контейнеров:"
docker compose ps

# Проверка, что все контейнеры запущены
FAILED_CONTAINERS=$(docker compose ps --format json | jq -r '.[] | select(.State != "running") | .Name' 2>/dev/null || docker compose ps | grep -v "Up" | grep -v "NAME" | awk '{print $1}' | grep -v "^$")
if [ ! -z "$FAILED_CONTAINERS" ]; then
    echo ""
    error "Некоторые контейнеры не запущены: $FAILED_CONTAINERS"
fi

# 9. Проверка логов
echo ""
echo "9. Проверка логов сервисов..."

echo ""
echo "Последние логи бота:"
docker compose logs --tail=20 bot 2>&1

echo ""
echo "Последние логи backend:"
docker compose logs --tail=20 crm-backend 2>&1

echo ""
echo "Последние логи frontend:"
docker compose logs --tail=20 crm-frontend 2>&1

# 10. Проверка работы API
echo ""
echo "10. Проверка работы API..."
sleep 3
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    success "API работает"
else
    info "API не отвечает (возможно, еще запускается)"
fi

echo ""
success "=== Готово! ==="
echo ""
echo "CRM доступна по адресу: http://momentumtrading.ru"
echo "Админка бота: http://momentumtrading.ru/bot-admin"
echo ""
echo "⚠️  Не забудьте обновить страницу с очисткой кэша (Ctrl+F5 или Ctrl+Shift+R)"
echo ""
echo "Для просмотра логов используйте:"
echo "  docker compose logs -f bot"
echo "  docker compose logs -f crm-backend"
echo "  docker compose logs -f crm-frontend"

