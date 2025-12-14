#!/bin/bash

echo "=== Проверка внешнего доступа ==="

# 1. Проверка внешнего IP
echo "1. Внешний IP сервера:"
curl -s ifconfig.me
echo ""

# 2. Проверка, что DNS указывает на правильный IP
echo "2. DNS запись для momentumtrading.ru:"
dig +short momentumtrading.ru
echo ""

# 3. Проверка доступности порта 80 извне
echo "3. Проверка доступности порта 80:"
EXTERNAL_IP=$(curl -s ifconfig.me)
echo "Попытка подключения к $EXTERNAL_IP:80..."
timeout 3 bash -c "echo > /dev/tcp/$EXTERNAL_IP/80" 2>/dev/null && echo "✅ Порт 80 доступен" || echo "❌ Порт 80 недоступен извне"

# 4. Проверка правил iptables для внешнего интерфейса
echo "4. Правила iptables для порта 80:"
iptables -L INPUT -n -v | grep :80 || echo "Нет правил для порта 80"

# 5. Проверка, не блокирует ли что-то порт
echo "5. Проверка процессов, слушающих порт 80:"
ss -tulpn | grep :80

# 6. Проверка конфигурации Nginx
echo "6. Проверка конфигурации Nginx для momentumtrading.ru:"
grep -A 2 "listen" /etc/nginx/sites-available/momentumtrading.ru | head -5

echo ""
echo "=== Рекомендации ==="
echo "Если порт недоступен извне:"
echo "1. Проверьте настройки firewall в панели REG.RU"
echo "2. Убедитесь, что порты 80 и 443 открыты в панели управления сервером"
echo "3. Проверьте, не блокирует ли провайдер порт 80"

