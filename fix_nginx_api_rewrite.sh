#!/bin/bash

echo "=== Исправление маршрутизации API в Nginx ==="

# Обновление конфигурации Nginx - убираем rewrite для /api
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name momentumtrading.ru www.momentumtrading.ru localhost _;

    # Логи
    access_log /var/log/nginx/momentumtrading_access.log;
    error_log /var/log/nginx/momentumtrading_error.log;

    # API запросы - проксируем как есть, БЕЗ rewrite
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

# Активация конфигурации
ln -sf /etc/nginx/sites-available/momentumtrading.ru /etc/nginx/sites-enabled/momentumtrading.ru

# Проверка и перезапуск
echo "Проверка конфигурации..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Перезапуск Nginx..."
    systemctl restart nginx
    
    echo ""
    echo "=== Готово! ==="
    echo "Проверьте работу API:"
    echo "curl http://momentumtrading.ru/api/health"
    echo "curl -X POST http://momentumtrading.ru/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"123@mail.ru\",\"password\":\"123\"}'"
else
    echo "Ошибка в конфигурации Nginx!"
    exit 1
fi

