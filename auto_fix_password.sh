#!/bin/bash

# Автоматическое исправление пароля PostgreSQL каждую минуту

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

# Пробуем установить пароль с разными методами
# Метод 1: через локальное подключение (trust)
if docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Пароль установлен через trust подключение"
elif docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Пароль установлен через пароль 'postgres'"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Не удалось установить пароль автоматически, пробуем перезапустить БД..."
    docker compose restart telegram_db_alex
    sleep 10
    
    # Пробуем снова после перезапуска
    if docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Пароль установлен после перезапуска БД"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Не удалось установить пароль даже после перезапуска"
        exit 1
    fi
fi

# Перезагружаем конфигурацию
docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || true

# Ждем
sleep 3

# Проверяем снова
BOT_CONNECTION_TEST=$(docker compose exec -T -e PGPASSWORD="$DB_PASS" bot psql -h telegram_db_alex -U postgres -d telegram_bot_db -c "SELECT 1;" 2>&1)

if echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Пароль исправлен и работает"
    # Перезапускаем бота, чтобы он переподключился
    docker compose restart bot > /dev/null 2>&1
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Не удалось исправить пароль"
fi

