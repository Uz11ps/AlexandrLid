#!/bin/bash

echo "=== Проверка статуса Nginx ==="

# 1. Проверка статуса Nginx
echo "1. Статус Nginx:"
systemctl status nginx --no-pager | head -10

# 2. Проверка конфигурации
echo ""
echo "2. Проверка конфигурации:"
nginx -t

# 3. Проверка портов
echo ""
echo "3. Проверка портов:"
ss -tulpn | grep :80 || echo "Порт 80 не слушается"

# 4. Проверка логов ошибок
echo ""
echo "4. Последние ошибки Nginx:"
tail -20 /var/log/nginx/error.log | tail -10

# 5. Попытка перезапуска
echo ""
echo "5. Попытка перезапуска Nginx..."
systemctl restart nginx
sleep 2

# 6. Проверка статуса после перезапуска
echo ""
echo "6. Статус после перезапуска:"
systemctl status nginx --no-pager | head -5

# 7. Проверка портов после перезапуска
echo ""
echo "7. Проверка портов после перезапуска:"
ss -tulpn | grep :80

echo ""
echo "=== Готово ==="

