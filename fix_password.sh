#!/bin/bash

# Быстрое исправление пароля PostgreSQL

echo "=== Исправление пароля PostgreSQL ==="

# Читаем пароль из .env
DB_PASS=$(grep "^DB_PASSWORD=" .env | head -n 1 | cut -d'=' -f2- | tr -d '\r' | tr -d '\"' | tr -d "'" | tr -d ' ')
if [ -z "$DB_PASS" ]; then
    DB_PASS="postgres"
fi

echo "Пароль из .env: [${#DB_PASS} символов]"

# Пробуем подключиться с паролем из .env
echo "Проверка текущего пароля..."
if docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Пароль уже правильный!"
    exit 0
fi

echo "Пароль не совпадает. Устанавливаем..."

# Пробуем установить пароль с разными вариантами
SQL_PASSWORD=$(echo "$DB_PASS" | sed "s/'/''/g")

# Вариант 1: пробуем с паролем 'postgres'
if docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
    echo "✅ Пароль установлен через 'postgres'"
else
    # Вариант 2: пробуем без пароля (trust для локальных подключений)
    if docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';" > /dev/null 2>&1; then
        echo "✅ Пароль установлен без пароля"
    else
        echo "❌ Не удалось установить пароль автоматически"
        echo "Попробуйте вручную:"
        echo "docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c \"ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';\""
        exit 1
    fi
fi

# Перезагружаем конфигурацию
echo "Перезагрузка конфигурации PostgreSQL..."
docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || \
docker compose exec -T -e PGPASSWORD="postgres" telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || \
docker compose exec -T telegram_db_alex psql -U postgres -d postgres -c "SELECT pg_reload_conf();" > /dev/null 2>&1 || true

# Ждем немного
sleep 2

# Проверяем пароль
echo "Проверка нового пароля..."
MAX_RETRIES=5
for i in $(seq 1 $MAX_RETRIES); do
    if docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Пароль работает! (попытка #$i)"
        break
    else
        if [ $i -eq $MAX_RETRIES ]; then
            echo "⚠️ Пароль все еще не работает после $MAX_RETRIES попыток"
            echo "Пробуем перезапустить базу..."
            docker compose restart telegram_db_alex
            sleep 5
            if docker compose exec -T -e PGPASSWORD="$DB_PASS" telegram_db_alex psql -U postgres -d telegram_bot_db -c "SELECT 1;" > /dev/null 2>&1; then
                echo "✅ Пароль работает после перезапуска!"
            else
                echo "❌ Пароль не работает даже после перезапуска"
                exit 1
            fi
        else
            echo "Попытка #$i: пароль еще не применился, ждем..."
            sleep 2
        fi
    fi
done

# Перезапускаем бота и бэкенд
echo "Перезапуск бота и бэкенда..."
docker compose restart bot crm-backend

echo "✅ Готово!"

