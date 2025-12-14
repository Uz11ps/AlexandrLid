# Исправление конфигурации Nginx

## Проблемы:
1. Порт 443 занят (Apache или другой сервис)
2. Nginx возвращает 404 для `/api/health`

## Решение:

### 1. Проверка и освобождение порта 443

```bash
# Проверка, что занимает порт 443
ss -tulpn | grep :443
# или
lsof -i :443

# Остановка Apache (если он занимает порт)
systemctl stop apache2
systemctl disable apache2
```

### 2. Исправление конфигурации Nginx

Проблема в том, что `/api` должен проксироваться на `http://127.0.0.1:3001/api`, но нужно правильно настроить маршрутизацию.

```bash
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80;
    server_name momentumtrading.ru www.momentumtrading.ru;

    # Проксирование API запросов на Backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Увеличение таймаутов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Проксирование на CRM Frontend
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
        
        # Увеличение таймаутов
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

# Проверка статуса
systemctl status nginx
```

### 3. Проверка работы

```bash
# Проверка через Nginx
curl http://localhost/api/health
curl http://localhost/

# Проверка через домен (если DNS настроен)
curl http://momentumtrading.ru/api/health
curl http://momentumtrading.ru/
```

### 4. Если все еще 404 для /api/health

Проверьте, что конфигурация активна:

```bash
# Проверка активных сайтов
ls -la /etc/nginx/sites-enabled/

# Убедитесь, что есть симлинк
ls -la /etc/nginx/sites-enabled/momentumtrading.ru

# Если нет, создайте
ln -sf /etc/nginx/sites-available/momentumtrading.ru /etc/nginx/sites-enabled/momentumtrading.ru

# Перезапуск
nginx -t
systemctl restart nginx
```

### 5. Настройка SSL (после исправления HTTP)

```bash
# После того как HTTP заработает, настройте SSL
certbot --nginx -d momentumtrading.ru -d www.momentumtrading.ru --email vvlad1001@gmail.com --agree-tos --non-interactive
```

