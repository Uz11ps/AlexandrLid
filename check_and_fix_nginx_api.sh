#!/bin/bash

echo "=== Проверка и исправление маршрутизации API в Nginx ==="

# 1. Проверка работы бэкенда напрямую
echo "1. Проверка бэкенда напрямую:"
curl -s http://localhost:3001/health || echo "❌ Бэкенд не отвечает"

# 2. Проверка текущей конфигурации Nginx
echo ""
echo "2. Текущая конфигурация Nginx для /api:"
cat /etc/nginx/sites-available/momentumtrading.ru | grep -A 10 "location /api" || echo "Конфигурация не найдена"

# 3. Исправление конфигурации
echo ""
echo "3. Обновление конфигурации Nginx..."
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
        
        # Для отладки
        add_header X-Debug-Backend "3001" always;
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

# 4. Активация конфигурации
ln -sf /etc/nginx/sites-available/momentumtrading.ru /etc/nginx/sites-enabled/momentumtrading.ru

# 5. Проверка конфигурации
echo ""
echo "4. Проверка конфигурации Nginx:"
if nginx -t; then
    echo "✅ Конфигурация корректна"
    
    # 6. Перезапуск Nginx
    echo ""
    echo "5. Перезапуск Nginx..."
    systemctl restart nginx
    sleep 2
    
    # 7. Проверка работы
    echo ""
    echo "6. Проверка работы API:"
    echo "Локально через Nginx:"
    curl -s http://localhost/api/health || echo "❌ Не работает"
    
    echo ""
    echo "Напрямую к бэкенду:"
    curl -s http://localhost:3001/health || echo "❌ Бэкенд не отвечает"
    
    echo ""
    echo "Через домен:"
    curl -s http://momentumtrading.ru/api/health || echo "❌ Не работает"
else
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi

echo ""
echo "=== Готово! ==="

