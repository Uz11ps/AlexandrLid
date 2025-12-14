#!/bin/bash

echo "=== Применение расширенной схемы БД для CRM ==="

# Проверка, что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    echo "Ошибка: docker-compose.yml не найден. Запустите скрипт из корня проекта."
    exit 1
fi

# Проверка существования файла миграции
if [ ! -f "init_crm_extended.sql" ]; then
    echo "Ошибка: init_crm_extended.sql не найден."
    exit 1
fi

echo "1. Копирование файла миграции в контейнер..."
docker compose cp init_crm_extended.sql postgres:/tmp/init_crm_extended.sql

if [ $? -ne 0 ]; then
    echo "Ошибка при копировании файла"
    exit 1
fi

echo "2. Применение миграции..."
docker compose exec -T postgres psql -U postgres -d telegram_bot_db < init_crm_extended.sql

if [ $? -eq 0 ]; then
    echo "✅ Миграция успешно применена!"
    echo ""
    echo "3. Перезапуск CRM Backend..."
    docker compose restart crm-backend
    echo ""
    echo "=== Готово! ==="
    echo "Проверьте работу API:"
    echo "curl http://localhost/api/health"
else
    echo "❌ Ошибка при применении миграции"
    echo "Проверьте логи выше"
    exit 1
fi

