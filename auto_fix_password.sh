#!/bin/bash

# Автоматическое исправление пароля PostgreSQL каждые 5 минут

cd /opt/AlexandrLid || exit 1

# Читаем пароль из .env
DB_PASS=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS" ]; then
    DB_PASS="postgres"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Проверка пароля БД..."

# Проверяем подключение из контейнера бота
BOT_CONNECTION_TEST=$(docker compose exec -T -e PGPASSWORD="$DB_PASS" bot psql -h telegram_db_alex -U postgres -d telegram_bot_db -c "SELECT 1;" 2>&1)

if echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Пароль работает"
    exit 0
fi

# Если пароль не работает, исправляем
echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Пароль не работает, исправляем..."

SQL_PASSWORD=$(echo "$DB_PASS" | sed "s/'/''/g")

# Устанавливаем пароль через локальное подключение
docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1

# Перезагружаем конфигурацию
docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1

# Ждем
sleep 3

# Проверяем снова
BOT_CONNECTION_TEST=$(docker compose exec -T -e PGPASSWORD="$DB_PASS" bot psql -h telegram_db_alex -U postgres -d telegram_bot_db -c "SELECT 1;" 2>&1)

if echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Пароль исправлен и работает"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Не удалось исправить пароль"
fi

