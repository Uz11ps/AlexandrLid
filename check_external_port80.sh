#!/bin/bash

echo "=== Проверка доступности порта 80 извне ==="

# 1. Проверка внешнего IP
EXTERNAL_IP=$(curl -s ifconfig.me)
echo "Внешний IP: $EXTERNAL_IP"

# 2. Проверка DNS
echo ""
echo "DNS запись:"
dig +short momentumtrading.ru

# 3. Проверка правил iptables
echo ""
echo "Правила iptables для порта 80:"
iptables -L INPUT -n -v | grep :80 || echo "Нет правил для порта 80"

# 4. Проверка UFW
echo ""
echo "Статус UFW:"
ufw status | head -5

# 5. Проверка, что Nginx слушает на всех интерфейсах
echo ""
echo "Проверка портов:"
ss -tulpn | grep :80

# 6. Тест подключения извне (если возможно)
echo ""
echo "Попытка подключения к порту 80 извне:"
timeout 3 bash -c "echo > /dev/tcp/$EXTERNAL_IP/80" 2>/dev/null && echo "✅ Порт 80 доступен" || echo "❌ Порт 80 недоступен извне"

# 7. Проверка через онлайн сервис
echo ""
echo "=== Рекомендации ==="
echo "Если порт недоступен извне:"
echo "1. Проверьте настройки Firewall в панели REG.RU"
echo "2. Убедитесь, что порты 80 и 443 открыты в панели управления сервером"
echo "3. Проверьте через онлайн сервис: https://www.yougetsignal.com/tools/open-ports/"
echo "   Введите IP: $EXTERNAL_IP и порт: 80"
echo ""
echo "4. Проверьте логи доступа при попытке подключения:"
echo "   tail -f /var/log/nginx/momentumtrading_access.log"
echo "   (откройте сайт в браузере и смотрите логи)"

