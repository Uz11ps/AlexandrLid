# Исправление конфликта Apache и Nginx

## Проблема
Apache перехватывает запросы до того, как они попадают в Nginx/Docker контейнеры.

## Решение 1: Остановка Apache (если он не нужен)

```bash
# Остановка Apache
systemctl stop apache2
systemctl disable apache2

# Проверка статуса
systemctl status apache2

# Перезапуск Nginx
systemctl restart nginx

# Проверка работы
curl http://localhost:3001/health
curl http://localhost:3000
```

## Решение 2: Настройка Apache для проксирования (если Apache нужен)

Если Apache используется для других сайтов, настроим его для проксирования на наши контейнеры:

### 2.1. Включение необходимых модулей Apache

```bash
a2enmod proxy
a2enmod proxy_http
a2enmod rewrite
systemctl restart apache2
```

### 2.2. Создание конфигурации для momentumtrading.ru

```bash
nano /etc/apache2/sites-available/momentumtrading.ru.conf
```

Вставьте следующую конфигурацию:

```apache
<VirtualHost *:80>
    ServerName momentumtrading.ru
    ServerAlias www.momentumtrading.ru

    # Проксирование на CRM Frontend
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Проксирование API запросов на Backend
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api

    # Логи
    ErrorLog ${APACHE_LOG_DIR}/momentumtrading_error.log
    CustomLog ${APACHE_LOG_DIR}/momentumtrading_access.log combined
</VirtualHost>
```

### 2.3. Активация сайта

```bash
a2ensite momentumtrading.ru.conf
systemctl reload apache2
```

### 2.4. Настройка SSL через Certbot для Apache

```bash
certbot --apache -d momentumtrading.ru -d www.momentumtrading.ru --email vvlad1001@gmail.com --agree-tos --non-interactive
```

## Решение 3: Использование только Nginx (рекомендуется)

Если Apache не нужен, лучше использовать только Nginx:

### 3.1. Остановка Apache

```bash
systemctl stop apache2
systemctl disable apache2
```

### 3.2. Проверка конфигурации Nginx

```bash
cat /etc/nginx/sites-available/momentumtrading.ru
```

Должна быть такая конфигурация:

```nginx
server {
    listen 80;
    server_name momentumtrading.ru www.momentumtrading.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3.3. Проверка и перезапуск Nginx

```bash
nginx -t
systemctl restart nginx
systemctl status nginx
```

### 3.4. Настройка SSL

```bash
certbot --nginx -d momentumtrading.ru -d www.momentumtrading.ru --email vvlad1001@gmail.com --agree-tos --non-interactive
```

## Проверка работы

После применения одного из решений:

```bash
# Проверка локально
curl http://localhost:3001/health
curl http://localhost:3000

# Проверка через домен (должно работать после настройки)
curl http://momentumtrading.ru/api/health
curl http://momentumtrading.ru
```

## Важно

- Endpoint для проверки здоровья Backend: `/api/health` (не `/health`)
- Frontend доступен по корневому пути: `/`
- API доступен по пути: `/api/*`

