#!/bin/bash

# Скрипт для исправления пароля PostgreSQL

set -e

echo "=== Исправление пароля PostgreSQL ==="

cd /opt/AlexandrLid || exit 1

# Читаем пароль из .env
if [ -f .env ]; then
    DB_PASS=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
else
    echo "⚠️ Файл .env не найден, используем 'postgres'"
    DB_PASS="postgres"
fi

if [ -z "$DB_PASS" ]; then
    DB_PASS="postgres"
fi

echo "Пароль из .env: [$DB_PASS] (длина: ${#DB_PASS})"

# Пробуем подключиться БЕЗ пароля (через trust для локальных подключений)
echo ""
echo "=== Попытка подключения БЕЗ пароля ==="
if docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Подключение БЕЗ пароля работает!"
    WORKING_METHOD="trust"
elif docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Пароль из .env УЖЕ работает!"
    echo "Проблема может быть в другом месте..."
    exit 0
elif docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Стандартный пароль 'postgres' работает!"
    WORKING_METHOD="postgres"
else
    echo "❌ Не удалось подключиться ни одним способом!"
    echo "Проверяем логи БД..."
    docker compose logs telegram_db_alex --tail 20 | grep -i "password\|auth\|error" || true
    exit 1
fi

# Устанавливаем пароль из .env
echo ""
echo "=== Установка пароля из .env ==="
SQL_PASSWORD=$(echo "$DB_PASS" | sed "s/'/''/g")  # Экранируем одинарные кавычки для SQL

if [ "$WORKING_METHOD" = "trust" ]; then
    echo "Устанавливаем пароль через trust подключение..."
    docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';"
elif [ "$WORKING_METHOD" = "postgres" ]; then
    echo "Устанавливаем пароль через подключение с паролем 'postgres'..."
    docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';"
fi

# Перезагружаем конфигурацию PostgreSQL
echo ""
echo "=== Перезагрузка конфигурации PostgreSQL ==="
if [ "$WORKING_METHOD" = "trust" ]; then
    docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();"
else
    docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" || \
    docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();"
fi

# Ждем
sleep 3

# Проверяем новый пароль
echo ""
echo "=== Проверка нового пароля ==="
MAX_RETRIES=5
for i in $(seq 1 $MAX_RETRIES); do
    if docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Пароль работает! (попытка #$i)"
        PASSWORD_WORKS=true
        break
    else
        if [ $i -eq $MAX_RETRIES ]; then
            echo "⚠️ Пароль все еще не работает после $MAX_RETRIES попыток"
            echo "Перезапускаем БД..."
            docker compose restart telegram_db_alex
            sleep 5
            
            # Ждем готовности БД
            for j in {1..10}; do
                if docker compose exec -T telegram_db_alex pg_isready -U postgres > /dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            
            # Финальная проверка
            if docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
                echo "✅ Пароль работает после перезапуска!"
                PASSWORD_WORKS=true
            else
                echo "❌ Пароль не работает даже после перезапуска!"
                PASSWORD_WORKS=false
            fi
        else
            echo "Попытка #$i: пароль еще не применился, ждем..."
            sleep 2
        fi
    fi
done

if [ "$PASSWORD_WORKS" != "true" ]; then
    echo "❌ КРИТИЧЕСКАЯ ОШИБКА: Пароль не работает!"
    exit 1
fi

# Перезапускаем бота и бэкенд
echo ""
echo "=== Перезапуск сервисов ==="
docker compose restart bot crm-backend
sleep 3

echo ""
echo "✅ Готово! Проверьте логи:"
echo "docker compose logs bot --tail 50 -f"

