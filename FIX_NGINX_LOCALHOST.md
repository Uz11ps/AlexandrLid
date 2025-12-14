# Исправление проблемы с server_name localhost в nginx.conf

## Проблема:
В основном конфигурационном файле `/etc/nginx/nginx.conf` есть блок `server { server_name localhost; }`, который перехватывает все запросы на localhost.

## Решение:

### Вариант 1: Удаление блока localhost из nginx.conf (рекомендуется)

```bash
# Резервная копия
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Редактирование файла
nano /etc/nginx/nginx.conf
```

Найдите и удалите или закомментируйте блок:
```nginx
server {
    server_name localhost;
    disable_symlinks if_not_owner;
    include /etc/nginx/vhosts-includes/*.conf;
    location @fallback {
        error_log /dev/null crit;
        proxy_pass http://127.0.0.1:8080;
        ...
    }
    listen 80;
}
```

Или используйте sed для автоматического удаления:

```bash
# Создание резервной копии
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Удаление блока server с localhost (осторожно - проверьте результат)
sed -i '/server_name localhost;/,/listen 80;/d' /etc/nginx/nginx.conf

# Проверка конфигурации
nginx -t

# Если все ок, перезапуск
systemctl restart nginx
```

### Вариант 2: Изменение приоритета через server_name

Обновите конфигурацию momentumtrading.ru, чтобы она имела более высокий приоритет:

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

### Вариант 3: Проверка и отключение конфигураций REG.RU

```bash
# Проверка конфигураций REG.RU
ls -la /etc/nginx/vhosts/

# Если там есть конфигурация для momentumtrading.ru, удалите или переименуйте её
ls -la /etc/nginx/vhosts/*/momentumtrading.ru*

# Переименование (если есть)
mv /etc/nginx/vhosts/*/momentumtrading.ru.conf /etc/nginx/vhosts/*/momentumtrading.ru.conf.disabled 2>/dev/null || true

# Перезапуск
nginx -t
systemctl restart nginx
```

## После исправления проверьте:

```bash
# Проверка конфигурации
nginx -t

# Перезапуск
systemctl restart nginx

# Проверка работы
curl http://localhost/api/health
curl http://localhost/

# Проверка через домен
curl http://momentumtrading.ru/api/health
curl http://momentumtrading.ru/
```

