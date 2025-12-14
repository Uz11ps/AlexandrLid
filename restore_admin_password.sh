#!/bin/bash

echo "=== Восстановление пароля администратора ==="

EMAIL="${1:-123@mail.ru}"
PASSWORD="${2:-123}"
NAME="${3:-Administrator}"

echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo "Name: $NAME"
echo ""

# Запуск скрипта создания администратора в контейнере CRM Backend
docker compose exec crm-backend node scripts/create-admin.js "$EMAIL" "$PASSWORD" "$NAME"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Пароль восстановлен!"
    echo ""
    echo "Теперь вы можете войти в CRM:"
    echo "URL: http://momentumtrading.ru"
    echo "Email: $EMAIL"
    echo "Password: $PASSWORD"
else
    echo ""
    echo "❌ Ошибка при восстановлении пароля"
    echo "Проверьте логи выше"
    exit 1
fi

