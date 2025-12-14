#!/bin/bash

echo "=== Проверка и исправление доступа к порту 80 ==="

# 1. Проверка, что Nginx слушает на всех интерфейсах
echo "1. Проверка портов Nginx..."
ss -tulpn | grep :80

# 2. Проверка firewall
echo "2. Проверка firewall..."
if command -v ufw &> /dev/null; then
    echo "UFW статус:"
    ufw status
    echo "Открытие портов 80 и 443..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw status
fi

# 3. Проверка iptables
echo "3. Проверка iptables..."
if command -v iptables &> /dev/null; then
    echo "Правила iptables для порта 80:"
    iptables -L -n | grep :80 || echo "Нет правил для порта 80"
    
    # Добавление правил если нужно
    echo "Добавление правил iptables для портов 80 и 443..."
    iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || iptables-save > /etc/iptables.rules 2>/dev/null || echo "Не удалось сохранить правила iptables"
fi

# 4. Проверка, что Nginx слушает на 0.0.0.0:80
echo "4. Проверка конфигурации Nginx..."
if ! ss -tulpn | grep -q "0.0.0.0:80"; then
    echo "Nginx не слушает на 0.0.0.0:80, проверьте конфигурацию"
    echo "Текущие слушающие порты:"
    ss -tulpn | grep nginx
fi

# 5. Проверка доступности порта извне
echo "5. Информация для проверки:"
echo "IP сервера: $(hostname -I | awk '{print $1}')"
echo "Проверьте доступность порта 80:"
echo "telnet $(hostname -I | awk '{print $1}') 80"
echo "или"
echo "nc -zv $(hostname -I | awk '{print $1}') 80"

echo ""
echo "=== Готово! ==="
echo "Если порт все еще недоступен, проверьте настройки у провайдера/хостинга"

