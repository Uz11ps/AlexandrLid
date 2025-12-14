#!/bin/bash

echo "=== Восстановление рабочей конфигурации Nginx ==="

# Создание правильной конфигурации
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name momentumtrading.ru www.momentumtrading.ru localhost _;

    access_log /var/log/nginx/momentumtrading_access.log;
    error_log /var/log/nginx/momentumtrading_error.log;

    # API запросы - проксируем как есть
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активация
ln -sf /etc/nginx/sites-available/momentumtrading.ru /etc/nginx/sites-enabled/momentumtrading.ru

# Проверка конфигурации
echo "Проверка конфигурации..."
if nginx -t; then
    echo "✅ Конфигурация корректна"
    echo "Перезапуск Nginx..."
    systemctl restart nginx
    sleep 2
    
    # Проверка статуса
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx запущен"
        echo ""
        echo "Проверка работы:"
        curl -s http://localhost/api/health | head -1
        echo ""
        curl -s http://localhost/ | head -5
    else
        echo "❌ Nginx не запустился"
        echo "Проверьте логи: tail -30 /var/log/nginx/error.log"
        exit 1
    fi
else
    echo "❌ Ошибка в конфигурации Nginx"
    echo "Проверьте вывод выше"
    exit 1
fi

echo ""
echo "=== Готово! ==="

