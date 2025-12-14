#!/bin/bash

echo "=== Финальная проверка и настройка SSL ==="

# 1. Проверка работы HTTP
echo "1. Проверка HTTP (http://momentumtrading.ru):"
curl -I http://momentumtrading.ru 2>&1 | head -5

# 2. Проверка работы HTTPS (скорее всего не работает без SSL)
echo ""
echo "2. Проверка HTTPS (https://momentumtrading.ru):"
curl -I -k https://momentumtrading.ru 2>&1 | head -5 || echo "HTTPS не настроен (это нормально)"

# 3. Проверка логов Nginx при запросе
echo ""
echo "3. Последние записи в логах Nginx:"
tail -10 /var/log/nginx/momentumtrading_access.log 2>/dev/null || echo "Лог пуст или не существует"

# 4. Проверка конфигурации для HTTPS
echo ""
echo "4. Проверка конфигурации SSL:"
if grep -q "listen 443" /etc/nginx/sites-available/momentumtrading.ru; then
    echo "✅ SSL конфигурация найдена"
else
    echo "⚠️ SSL конфигурация отсутствует"
fi

# 5. Рекомендации
echo ""
echo "=== Рекомендации ==="
echo "Если сайт не открывается в браузере:"
echo "1. Убедитесь, что используете HTTP (не HTTPS): http://momentumtrading.ru"
echo "2. Очистите кеш браузера (Ctrl+Shift+Delete)"
echo "3. Попробуйте открыть в режиме инкогнито"
echo "4. Проверьте с другого устройства/сети"
echo ""
echo "Для настройки SSL (HTTPS) выполните:"
echo "certbot --nginx -d momentumtrading.ru -d www.momentumtrading.ru"

