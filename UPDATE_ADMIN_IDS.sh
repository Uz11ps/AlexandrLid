#!/bin/bash

echo "=== Обновление ADMIN_IDS в .env ==="

cd /opt/AlexandrLid

# Проверка существования .env
if [ ! -f .env ]; then
    echo "Создание .env файла..."
    touch .env
fi

# Обновление или добавление ADMIN_IDS
if grep -q "ADMIN_IDS=" .env; then
    echo "Обновление существующего ADMIN_IDS..."
    sed -i 's/^ADMIN_IDS=.*/ADMIN_IDS=916948327,674625025,6700918468,8005344926/' .env
else
    echo "Добавление нового ADMIN_IDS..."
    echo "ADMIN_IDS=916948327,674625025,6700918468,8005344926" >> .env
fi

echo ""
echo "Текущее содержимое ADMIN_IDS:"
grep "ADMIN_IDS" .env

echo ""
echo "Перезапуск бота для применения изменений..."
docker compose restart bot

echo ""
echo "=== Готово! ==="

