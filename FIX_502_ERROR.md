# Исправление ошибки 502 Bad Gateway

## Проблема
Nginx не может подключиться к контейнерам (CRM Frontend/Backend).

## Диагностика

Выполните на сервере:

```bash
# 1. Проверка статуса контейнеров
docker compose ps

# 2. Проверка доступности контейнеров локально
curl http://localhost:3001/health
curl http://localhost:3000

# 3. Проверка логов контейнеров
docker compose logs crm-frontend | tail -20
docker compose logs crm-backend | tail -20

# 4. Проверка конфигурации Nginx
cat /etc/nginx/sites-available/momentumtrading.ru
nginx -t

# 5. Проверка логов Nginx
tail -50 /var/log/nginx/error.log
```

## Решение 1: Проверка работы контейнеров

Если контейнеры не работают:

```bash
cd /opt/AlexandrLid

# Перезапуск всех контейнеров
docker compose restart

# Проверка логов
docker compose logs -f
```

## Решение 2: Исправление конфигурации Nginx

### 2.1. Обновление конфигурации Nginx

```bash
cat > /etc/nginx/sites-available/momentumtrading.ru << 'EOF'
server {
    listen 80;
    server_name momentumtrading.ru www.momentumtrading.ru;

    # Увеличение таймаутов
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;

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
    }

    # Проксирование API запросов на Backend
    location /api {
        proxy_pass http://127.0.0.1:3001;
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

# Проверка конфигурации
nginx -t

# Перезапуск Nginx
systemctl restart nginx
```

## Решение 3: Проверка портов и firewall

```bash
# Проверка, что порты слушаются
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Если порты не слушаются, проверьте docker-compose.yml
cd /opt/AlexandrLid
cat docker-compose.yml | grep -A 5 "ports:"
```

## Решение 4: Проверка docker-compose.yml

Убедитесь, что порты правильно проброшены:

```bash
cd /opt/AlexandrLid
cat docker-compose.yml
```

Должно быть:
```yaml
crm-backend:
  ports:
    - "3001:3001"

crm-frontend:
  ports:
    - "3000:80"
```

Если порты не проброшены наружу (только для внутреннего использования), убедитесь, что они доступны на localhost.

## Решение 5: Пересборка и перезапуск

```bash
cd /opt/AlexandrLid

# Остановка всех контейнеров
docker compose down

# Пересборка
docker compose build

# Запуск
docker compose up -d

# Проверка статуса
docker compose ps

# Проверка логов
docker compose logs -f
```

## Решение 6: Проверка переменных окружения

```bash
cd /opt/AlexandrLid

# Проверка .env файла
cat .env | grep -v "PASSWORD\|SECRET\|TOKEN"

# Убедитесь, что все переменные заполнены
```

## Проверка после исправления

```bash
# 1. Проверка локально
curl http://localhost:3001/health
curl http://localhost:3000

# 2. Проверка через Nginx
curl http://localhost/api/health
curl http://localhost

# 3. Проверка через домен (если DNS настроен)
curl http://momentumtrading.ru/api/health
```

## Если проблема с REG.RU панелью управления

Если домен управляется через панель REG.RU и там есть свой веб-сервер:

1. Отключите веб-сервер в панели REG.RU
2. Или настройте DNS записи для прямого указания на ваш сервер:
   - A запись: `momentumtrading.ru` -> `95.163.227.114`
   - A запись: `www.momentumtrading.ru` -> `95.163.227.114`

## Дополнительная диагностика

```bash
# Проверка всех сетевых подключений Docker
docker network ls
docker network inspect alexandrlid_default

# Проверка логов всех сервисов
docker compose logs --tail=50

# Проверка использования ресурсов
docker stats
```

