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

echo "=== Полная пересборка всего проекта ==="

# Проверка директории
if [ ! -f "docker-compose.yml" ]; then
    error "Файл docker-compose.yml не найден. Убедитесь, что вы находитесь в корне проекта."
fi

# 1. Остановка всех контейнеров
info "Остановка всех контейнеров и удаление локальных образов..."
docker compose down --rmi local

# 2. Удаление старых контейнеров
info "Удаление старых контейнеров..."
docker compose rm -f

# 3. Очистка кэша сборки
info "Очистка кэша сборки..."
docker builder prune -f

# 4. Обновление кода
info "Обновление кода из репозитория..."
git pull

# 5. Пересборка сервисов
info "Полная пересборка всех сервисов БЕЗ кэша..."
# Экспортируем переменные из .env для корректной интерполяции в docker-compose.yml
export $(grep -v '^#' .env | xargs)
if ! docker compose build --no-cache --pull; then
    error "Не удалось пересобрать сервисы"
fi

# 6. Запуск всех сервисов
info "Запуск всех сервисов..."
if ! docker compose up -d; then
    error "Не удалось запустить сервисы"
fi

# 7. Ожидание готовности PostgreSQL
info "Ожидание готовности PostgreSQL..."
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

# 8. Синхронизация пароля (Через переменную окружения для надежности)
info "Синхронизация пароля PostgreSQL..."
# Более надежный метод извлечения: убираем комментарии, пробелы и кавычки
DB_PASS=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2- | sed 's/[[:space:]]*#.*$//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")

if [ -z "$DB_PASS" ]; then
    info "⚠️  DB_PASSWORD не найден в .env, используем 'postgres'"
    DB_PASS="postgres"
fi

info "Попытка установить пароль для пользователя postgres (длина пароля: ${#DB_PASS})..."
# Используем psql для смены пароля. Важно: Host shell расширяет $DB_PASS
if docker compose exec -T -u postgres postgres psql -d postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';" ; then
    success "Пароль PostgreSQL успешно обновлен в базе"
else
    info "⚠️  Не удалось обновить пароль первым методом. Пробуем второй..."
    # Если первый метод не сработал (редко), пробуем через PGPASSWORD
    docker compose exec -T -e PGPASSWORD=postgres -u postgres postgres psql -d postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';" || info "Все методы смены пароля исчерпаны."
fi

# 9. Обновление прав
info "Обновление прав доступа..."
docker compose exec -T -u postgres postgres psql -d telegram_bot_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;" > /dev/null

# 10. Принудительный перезапуск
info "Принудительное пересоздание сервисов с новым паролем..."
docker compose up -d --force-recreate bot crm-backend
sleep 5

# 11. Создание администратора
info "Создание администратора..."
docker compose exec -T crm-backend node scripts/create-admin.js "123@mail.ru" "123" "Administrator"

success "=== ГОТОВО! ==="
echo "Попробуйте написать боту /start"
