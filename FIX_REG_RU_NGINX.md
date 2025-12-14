# Исправление конфликта с Nginx от панели REG.RU

## Проблема:
DNS настроен правильно, но запросы через домен возвращают 502 Bad Gateway, хотя локально все работает.

## Причина:
Панель управления REG.RU создает свою конфигурацию Nginx в `/etc/nginx/vhosts/`, которая перехватывает запросы.

## Решение:

### 1. Проверка конфигураций REG.RU

```bash
# Проверка конфигураций в vhosts
ls -la /etc/nginx/vhosts/
find /etc/nginx/vhosts/ -name "*momentumtrading*"

# Просмотр конфигурации
cat /etc/nginx/vhosts/*/momentumtrading.ru.conf 2>/dev/null
```

### 2. Отключение конфигурации REG.RU

```bash
# Поиск всех конфигураций для momentumtrading.ru
find /etc/nginx/vhosts/ -name "*momentumtrading*"

# Переименование (отключение) конфигураций REG.RU
find /etc/nginx/vhosts/ -name "*momentumtrading*" -exec mv {} {}.disabled \;

# Или удаление (если уверены)
# find /etc/nginx/vhosts/ -name "*momentumtrading*" -delete
```

### 3. Проверка основной конфигурации Nginx

```bash
# Проверка, какие конфигурации загружаются
grep -r "include.*vhosts" /etc/nginx/nginx.conf

# Если есть include /etc/nginx/vhosts/*/*.conf, временно закомментируйте
nano /etc/nginx/nginx.conf
# Найдите строку: include /etc/nginx/vhosts/*/*.conf;
# Закомментируйте её: # include /etc/nginx/vhosts/*/*.conf;
```

### 4. Обновление конфигурации momentumtrading.ru

Убедитесь, что наша конфигурация имеет приоритет:

```bash
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name momentumtrading.ru www.momentumtrading.ru localhost _;

    # Логи
    access_log /var/log/nginx/momentumtrading_access.log;
    error_log /var/log/nginx/momentumtrading_error.log;

    # API запросы
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

nginx -t
systemctl restart nginx
```

### 5. Альтернативное решение: Использование конфигурации REG.RU

Если нельзя отключить конфигурацию REG.RU, можно обновить её:

```bash
# Найти конфигурацию REG.RU
find /etc/nginx/vhosts/ -name "*momentumtrading*"

# Отредактировать её
nano /etc/nginx/vhosts/*/momentumtrading.ru.conf

# Заменить содержимое на нашу конфигурацию (см. выше)
```

### 6. Проверка после исправления

```bash
# Проверка конфигурации
nginx -t

# Перезапуск
systemctl restart nginx

# Проверка работы
curl http://momentumtrading.ru/api/health
curl http://momentumtrading.ru/

# Проверка логов
tail -20 /var/log/nginx/momentumtrading_error.log
```

