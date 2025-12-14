#!/bin/bash

echo "=== Создание администратора CRM ==="

EMAIL="${1:-123@mail.ru}"
PASSWORD="${2:-123}"
NAME="${3:-Administrator}"

echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Name: $NAME"
echo ""

# Запуск скрипта создания администратора в контейнере CRM Backend
docker compose exec crm-backend node scripts/create-admin.js "$EMAIL" "$PASSWORD" "$NAME"

echo ""
echo "=== Готово! ==="
echo "Теперь вы можете войти в CRM по адресу: http://momentumtrading.ru"
echo "Email: $EMAIL"
echo "Password: $PASSWORD"

