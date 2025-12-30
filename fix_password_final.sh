#!/bin/bash

# Финальное исправление пароля PostgreSQL с проверкой сетевого подключения

set -e

echo "=== Финальное исправление пароля PostgreSQL ==="

cd /opt/AlexandrLid || exit 1

# Читаем пароль из .env
DB_PASS=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS" ]; then
    DB_PASS="postgres"
fi

echo "Пароль из .env: [$DB_PASS] (длина: ${#DB_PASS})"

# 1. Устанавливаем пароль через локальное подключение
echo ""
echo "=== Установка пароля ==="
SQL_PASSWORD=$(echo "$DB_PASS" | sed "s/'/''/g")
docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" || {
    echo "❌ Не удалось установить пароль!"
    exit 1
}

# 2. Перезагружаем конфигурацию
echo "Перезагрузка конфигурации PostgreSQL..."
docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();"

# 3. Проверяем pg_hba.conf
echo ""
echo "=== Проверка pg_hba.conf ==="
PG_HBA_CHECK=$(docker compose exec -T telegram_db_alex cat /var/lib/postgresql/data/pg_hba.conf 2>/dev/null | grep -E "host.*all.*all.*0\.0\.0\.0/0.*scram-sha-256|host.*all.*all.*::/0.*scram-sha-256" || echo "")
if [ -z "$PG_HBA_CHECK" ]; then
    echo "⚠️ pg_hba.conf не содержит правил для сетевых подключений. Добавляем..."
    docker compose exec -T telegram_db_alex sh -c "echo 'host    all             all             0.0.0.0/0               scram-sha-256' >> /var/lib/postgresql/data/pg_hba.conf"
    docker compose exec -T telegram_db_alex sh -c "echo 'host    all             all             ::/0                    scram-sha-256' >> /var/lib/postgresql/data/pg_hba.conf"
    docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();"
    echo "✅ pg_hba.conf обновлен!"
else
    echo "✅ pg_hba.conf настроен правильно"
fi

# 4. Ждем
sleep 5

# 5. Проверяем подключение из контейнера бота
echo ""
echo "=== Проверка подключения из контейнера бота ==="
docker compose exec -T bot sh -c "apk add --no-cache postgresql-client > /dev/null 2>&1 || true" 2>&1 > /dev/null

BOT_CONNECTION_TEST=$(docker compose exec -T -e PGPASSWORD="$DB_PASS" bot psql -h telegram_db_alex -U postgres -d telegram_bot_db -c "SELECT 1;" 2>&1)
if echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
    echo "✅ Подключение из контейнера бота работает!"
elif echo "$BOT_CONNECTION_TEST" | grep -q "password authentication failed"; then
    echo "❌ Пароль не работает для сетевого подключения!"
    echo "Пробуем перезапустить БД..."
    docker compose restart telegram_db_alex
    sleep 10
    
    # Проверяем снова
    BOT_CONNECTION_TEST=$(docker compose exec -T -e PGPASSWORD="$DB_PASS" bot psql -h telegram_db_alex -U postgres -d telegram_bot_db -c "SELECT 1;" 2>&1)
    if echo "$BOT_CONNECTION_TEST" | grep -q "1"; then
        echo "✅ Подключение работает после перезапуска БД!"
    else
        echo "❌ Проблема сохраняется!"
        echo "Вывод теста подключения:"
        echo "$BOT_CONNECTION_TEST"
        exit 1
    fi
else
    echo "⚠️ Неожиданный результат проверки подключения:"
    echo "$BOT_CONNECTION_TEST"
fi

# 6. Перезапускаем бота и бэкенд
echo ""
echo "=== Перезапуск сервисов ==="
docker compose restart bot crm-backend
sleep 5

echo ""
echo "✅ Готово! Проверьте логи:"
echo "docker compose logs bot --tail 50 -f"

