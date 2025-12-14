#!/bin/bash

echo "=== Полная пересборка всего проекта ==="

cd /opt/AlexandrLid

# 1. Остановка всех контейнеров
echo ""
echo "1. Остановка всех контейнеров..."
docker compose down

# 2. Удаление всех образов (опционально, можно закомментировать если не нужно)
echo ""
echo "2. Удаление старых образов..."
docker compose rm -f

# 3. Очистка кэша сборки
echo ""
echo "3. Очистка кэша сборки..."
docker builder prune -f

# 4. Обновление кода
echo ""
echo "4. Обновление кода из репозитория..."
git pull

# 5. Полная пересборка всех сервисов БЕЗ кэша
echo ""
echo "5. Полная пересборка всех сервисов (это займет время)..."
docker compose build --no-cache --pull

# 6. Запуск всех сервисов
echo ""
echo "6. Запуск всех сервисов..."
docker compose up -d

# 7. Ожидание готовности
echo ""
echo "7. Ожидание готовности сервисов..."
sleep 15

# 8. Проверка статуса
echo ""
echo "8. Статус контейнеров:"
docker compose ps

# 9. Проверка логов frontend
echo ""
echo "9. Последние логи frontend:"
docker compose logs --tail=20 crm-frontend

# 10. Проверка работы API
echo ""
echo "10. Проверка работы API:"
curl -s http://localhost/api/health | head -1

echo ""
echo "=== Готово! ==="
echo "CRM доступна по адресу: http://momentumtrading.ru"
echo "Обновите страницу с очисткой кэша (Ctrl+F5 или Ctrl+Shift+R)"

