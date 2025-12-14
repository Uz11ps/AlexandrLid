#!/bin/bash

echo "=== Исправление пути API в Nginx ==="

# Проблема: Nginx передает /api/health на бэкенд, но бэкенд ожидает /health
# Решение: убрать /api из пути при проксировании

cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name momentumtrading.ru www.momentumtrading.ru localhost _;

    access_log /var/log/nginx/momentumtrading_access.log;
    error_log /var/log/nginx/momentumtrading_error.log;

    # API запросы - убираем /api из пути перед проксированием
    location /api {
        rewrite ^/api/(.*) /$1 break;
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

# Проверка и перезапуск
if nginx -t; then
    echo "✅ Конфигурация корректна"
    systemctl restart nginx
    sleep 2
    
    echo ""
    echo "Проверка работы:"
    echo "Локально:"
    curl -s http://localhost/api/health
    echo ""
    echo "Через домен:"
    curl -s http://momentumtrading.ru/api/health
else
    echo "❌ Ошибка в конфигурации"
    exit 1
fi

echo ""
echo "=== Готово! ==="

