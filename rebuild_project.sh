#!/bin/bash

echo "=== Пересборка проекта в Docker ==="

# 1. Остановка контейнеров
echo "1. Остановка контейнеров..."
docker compose down

# 2. Пересборка образов
echo "2. Пересборка образов..."
docker compose build --no-cache

# 3. Запуск контейнеров
echo "3. Запуск контейнеров..."
docker compose up -d

# 4. Ожидание готовности сервисов
echo "4. Ожидание готовности сервисов..."
sleep 5

# 5. Проверка статуса
echo "5. Статус контейнеров:"
docker compose ps

# 6. Проверка логов
echo ""
echo "6. Последние логи CRM Backend:"
docker compose logs crm-backend | tail -10

echo ""
echo "=== Готово! ==="
echo "Проверьте работу:"
echo "curl http://localhost/api/health"

