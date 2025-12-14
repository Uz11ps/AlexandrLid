#!/bin/bash

echo "=== Исправление конфигурации Nginx для momentumtrading.ru ==="

# 1. Поиск конфигураций REG.RU для momentumtrading.ru
echo "1. Поиск конфигураций REG.RU..."
find /etc/nginx/vhosts/ -name "*momentumtrading*" -type f

# 2. Отключение конфигураций REG.RU (переименование)
echo "2. Отключение конфигураций REG.RU..."
find /etc/nginx/vhosts/ -name "*momentumtrading*" -type f -exec mv {} {}.disabled \;

# 3. Резервная копия nginx.conf
echo "3. Создание резервной копии nginx.conf..."
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 4. Закомментирование строки с vhosts в nginx.conf
echo "4. Закомментирование include vhosts в nginx.conf..."
sed -i 's|include /etc/nginx/vhosts/\*/\*.conf;|# include /etc/nginx/vhosts/*/*.conf;|g' /etc/nginx/nginx.conf

# 5. Обновление конфигурации momentumtrading.ru
echo "5. Обновление конфигурации momentumtrading.ru..."
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name momentumtrading.ru www.momentumtrading.ru localhost _;

    # Логи
    access_log /var/log/nginx/momentumtrading_access.log;
    error_log /var/log/nginx/momentumtrading_error.log;

    # API запросы - убираем /api из пути
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

# 6. Убедиться, что конфигурация активна
echo "6. Активация конфигурации..."
ln -sf /etc/nginx/sites-available/momentumtrading.ru /etc/nginx/sites-enabled/momentumtrading.ru

# 7. Проверка конфигурации
echo "7. Проверка конфигурации Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "8. Перезапуск Nginx..."
    systemctl restart nginx
    
    echo "9. Проверка работы..."
    sleep 2
    curl -s http://localhost/api/health
    echo ""
    curl -s http://localhost/ | head -5
    
    echo ""
    echo "=== Готово! ==="
    echo "Проверьте работу через домен:"
    echo "curl http://momentumtrading.ru/api/health"
    echo "curl http://momentumtrading.ru/"
else
    echo "Ошибка в конфигурации Nginx! Проверьте вывод выше."
    exit 1
fi

