#!/bin/bash

echo "=== Применение всех изменений CRM ==="

# 1. Обновление кода
echo "1. Обновление кода из репозитория..."
cd /opt/AlexandrLid
git pull

# 2. Применение миграции БД (если еще не применена)
echo ""
echo "2. Проверка и применение миграции БД..."
if docker compose exec -T postgres psql -U postgres -d telegram_bot_db -c "\dt" | grep -q "courses"; then
    echo "Миграция уже применена"
else
    echo "Применение миграции..."
    docker compose cp init_crm_extended.sql postgres:/tmp/
    docker compose exec -T postgres psql -U postgres -d telegram_bot_db -f /tmp/init_crm_extended.sql
fi

# 3. Пересборка всех сервисов
echo ""
echo "3. Пересборка сервисов..."
docker compose build --no-cache

# 4. Перезапуск сервисов
echo ""
echo "4. Перезапуск сервисов..."
docker compose down
docker compose up -d

# 5. Ожидание готовности
echo ""
echo "5. Ожидание готовности сервисов..."
sleep 10

# 6. Проверка статуса
echo ""
echo "6. Статус контейнеров:"
docker compose ps

# 7. Проверка работы API
echo ""
echo "7. Проверка работы API:"
echo "Health check:"
curl -s http://localhost/api/health | head -1

echo ""
echo "=== Готово! ==="
echo "CRM доступна по адресу: http://momentumtrading.ru"
echo "Логин: 123@mail.ru"
echo "Пароль: 123"

