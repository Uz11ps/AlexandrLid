# Исправление проблемы с дефолтной конфигурацией Nginx

## Проблема:
Дефолтная конфигурация Nginx перехватывает запросы вместо нашей конфигурации.

## Решение:

### 1. Отключение дефолтной конфигурации

```bash
# Удаление дефолтной конфигурации
rm -f /etc/nginx/sites-enabled/default

# Проверка активных конфигураций
ls -la /etc/nginx/sites-enabled/
```

### 2. Проверка и исправление конфигурации

```bash
# Проверка текущей конфигурации
cat /etc/nginx/sites-available/momentumtrading.ru

# Обновление конфигурации с правильными настройками
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name momentumtrading.ru www.momentumtrading.ru _;

    # Логи
    access_log /var/log/nginx/momentumtrading_access.log;
    error_log /var/log/nginx/momentumtrading_error.log;

    # API запросы - проксируем на Backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Все остальное - проксируем на Frontend
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
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Проверка конфигурации
nginx -t

# Перезапуск Nginx
systemctl restart nginx
systemctl status nginx
```

### 3. Проверка, что контейнеры слушают на правильных адресах

```bash
# Проверка портов
ss -tulpn | grep :3000
ss -tulpn | grep :3001

# Должно быть что-то вроде:
# 0.0.0.0:3000 или 127.0.0.1:3000
# 0.0.0.0:3001 или 127.0.0.1:3001
```

### 4. Если контейнеры слушают на 0.0.0.0, но не на 127.0.0.1

Проверьте docker-compose.yml и убедитесь, что порты проброшены:

```bash
cd /opt/AlexandrLid
cat docker-compose.yml | grep -A 3 "crm-backend:" -A 10
cat docker-compose.yml | grep -A 3 "crm-frontend:" -A 10
```

### 5. Проверка работы после исправления

```bash
# Проверка локально
curl -v http://localhost/api/health
curl -v http://localhost/

# Проверка через домен
curl -v http://momentumtrading.ru/api/health
curl -v http://momentumtrading.ru/

# Проверка логов Nginx
tail -20 /var/log/nginx/momentumtrading_error.log
tail -20 /var/log/nginx/momentumtrading_access.log
```

### 6. Альтернативное решение: использование IP вместо localhost

Если localhost не работает, попробуйте использовать IP контейнера:

```bash
# Получение IP адресов контейнеров
docker inspect crm_backend_app | grep IPAddress
docker inspect crm_frontend_app | grep IPAddress

# Обновление конфигурации с IP адресами
# (замените IP_ADDRESS_BACKEND и IP_ADDRESS_FRONTEND на реальные IP)
```

Но лучше использовать localhost, так как порты проброшены на хост.

