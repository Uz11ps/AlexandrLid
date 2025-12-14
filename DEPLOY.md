# Инструкция по деплою на сервер

## Информация о сервере

- **Домен**: momentumtrading.ru
- **IP**: 95.163.227.114
- **Логин**: root
- **Пароль**: tgauzRycvJ4r6pSa

## Шаг 1: Подключение к серверу

```bash
ssh root@95.163.227.114
# Введите пароль: tgauzRycvJ4r6pSa
```

## Шаг 2: Установка необходимого ПО

### 2.1. Обновление системы

```bash
apt update && apt upgrade -y
```

### 2.2. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
apt install docker-compose-plugin -y

# Проверка установки
docker --version
docker compose version
```

### 2.3. Установка Git

```bash
apt install git -y
```

### 2.4. Установка Nginx (для проксирования)

```bash
apt install nginx -y
systemctl enable nginx
systemctl start nginx
```

## Шаг 3: Клонирование репозитория

```bash
cd /opt
git clone https://github.com/Uz11ps/AlexandrLid.git
cd AlexandrLid
```

## Шаг 4: Настройка переменных окружения

### 4.1. Создание файла .env

```bash
cp env.example.txt .env
nano .env
```

### 4.2. Заполните .env файл следующими данными:

```env
# Telegram Bot
BOT_TOKEN=ваш_токен_бота_от_BotFather
BOT_USERNAME=ваш_username_бота

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=telegram_bot_db
DB_USER=postgres
DB_PASSWORD=postgres

# Admin IDs (через запятую)
ADMIN_IDS=916948327,674625025,6700918468,8005344926

# CRM Backend
PORT=3001
JWT_SECRET=сгенерируйте_случайную_строку_для_jwt_секрета
```

**Важно**: 
- Замените `BOT_TOKEN` на реальный токен от @BotFather
- Замените `BOT_USERNAME` на username вашего бота
- Сгенерируйте случайный JWT_SECRET (можно использовать: `openssl rand -hex 32`)

## Шаг 5: Настройка Nginx для домена

### 5.1. Создание конфигурации Nginx

```bash
nano /etc/nginx/sites-available/momentumtrading.ru
```

### 5.2. Вставьте следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name momentumtrading.ru www.momentumtrading.ru;

    # Проксирование на CRM Frontend
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

    # Проксирование API запросов на Backend
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

### 5.3. Активация конфигурации

```bash
ln -s /etc/nginx/sites-available/momentumtrading.ru /etc/nginx/sites-enabled/
nginx -t  # Проверка конфигурации
systemctl reload nginx
```

## Шаг 6: Настройка SSL сертификата (Let's Encrypt)

```bash
# Установка Certbot
apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
certbot --nginx -d momentumtrading.ru -d www.momentumtrading.ru

# Автоматическое обновление (будет настроено автоматически)
```

## Шаг 7: Обновление docker-compose.yml для продакшена

Отредактируйте `docker-compose.yml` и убедитесь, что порты настроены правильно:

```bash
nano docker-compose.yml
```

Убедитесь, что:
- `crm-backend` слушает на порту 3001
- `crm-frontend` слушает на порту 3000
- Порты не проброшены наружу (только для внутреннего использования)

## Шаг 8: Запуск проекта

### 8.1. Сборка и запуск контейнеров

```bash
cd /opt/AlexandrLid
docker compose down  # Остановить существующие контейнеры (если есть)
docker compose build  # Сборка образов
docker compose up -d  # Запуск в фоновом режиме
```

### 8.2. Проверка статуса

```bash
docker compose ps
docker compose logs -f  # Просмотр логов
```

## Шаг 9: Создание первого администратора CRM

```bash
docker compose exec crm-backend node scripts/create-admin.js admin@momentumtrading.ru ваш_пароль "Admin Name"
```

## Шаг 10: Настройка автоматического обновления (опционально)

### 10.1. Создание скрипта для обновления

```bash
nano /opt/AlexandrLid/update.sh
```

Вставьте:

```bash
#!/bin/bash
cd /opt/AlexandrLid
git pull
docker compose down
docker compose build
docker compose up -d
echo "Обновление завершено: $(date)"
```

### 10.2. Делаем скрипт исполняемым

```bash
chmod +x /opt/AlexandrLid/update.sh
```

### 10.3. Настройка cron для автоматического обновления (если нужно)

```bash
crontab -e
# Добавьте строку для ежедневного обновления в 3:00
0 3 * * * /opt/AlexandrLid/update.sh >> /var/log/crm-update.log 2>&1
```

## Шаг 11: Настройка бэкапов базы данных

### 11.1. Создание скрипта бэкапа

```bash
nano /opt/AlexandrLid/backup-db.sh
```

Вставьте:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose exec -T postgres pg_dump -U postgres telegram_bot_db > $BACKUP_DIR/backup_$DATE.sql

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Бэкап создан: backup_$DATE.sql"
```

### 11.2. Делаем скрипт исполняемым

```bash
chmod +x /opt/AlexandrLid/backup-db.sh
```

### 11.3. Настройка ежедневного бэкапа

```bash
crontab -e
# Добавьте строку для ежедневного бэкапа в 2:00
0 2 * * * /opt/AlexandrLid/backup-db.sh >> /var/log/crm-backup.log 2>&1
```

## Шаг 12: Проверка работы системы

### 12.1. Проверка доступности сервисов

```bash
# Проверка бота
docker compose logs bot | tail -20

# Проверка CRM Backend
curl http://localhost:3001/health

# Проверка CRM Frontend
curl http://localhost:3000
```

### 12.2. Проверка через браузер

Откройте в браузере:
- https://momentumtrading.ru - CRM Frontend
- https://momentumtrading.ru/api/health - CRM Backend Health Check

## Шаг 13: Мониторинг и логи

### Просмотр логов всех сервисов

```bash
docker compose logs -f
```

### Просмотр логов конкретного сервиса

```bash
docker compose logs -f bot
docker compose logs -f crm-backend
docker compose logs -f crm-frontend
docker compose logs -f postgres
```

## Полезные команды

### Перезапуск сервисов

```bash
docker compose restart bot
docker compose restart crm-backend
docker compose restart crm-frontend
```

### Остановка всех сервисов

```bash
docker compose down
```

### Запуск всех сервисов

```bash
docker compose up -d
```

### Просмотр использования ресурсов

```bash
docker stats
```

### Вход в контейнер базы данных

```bash
docker compose exec postgres psql -U postgres -d telegram_bot_db
```

## Решение проблем

### Если порты заняты

```bash
# Проверка занятых портов
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :5433

# Остановка процессов (если нужно)
kill -9 <PID>
```

### Если контейнеры не запускаются

```bash
# Просмотр детальных логов
docker compose logs --tail=100

# Пересборка без кэша
docker compose build --no-cache
docker compose up -d
```

### Если база данных не подключается

```bash
# Проверка статуса PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Проверка подключения
docker compose exec postgres psql -U postgres -d telegram_bot_db -c "SELECT 1;"
```

## Безопасность

1. **Измените пароль root** после первого входа:
   ```bash
   passwd
   ```

2. **Настройте firewall**:
   ```bash
   apt install ufw -y
   ufw allow 22/tcp   # SSH
   ufw allow 80/tcp   # HTTP
   ufw allow 443/tcp  # HTTPS
   ufw enable
   ```

3. **Регулярно обновляйте систему**:
   ```bash
   apt update && apt upgrade -y
   ```

4. **Используйте сильные пароли** для JWT_SECRET и базы данных

## Контакты и поддержка

При возникновении проблем проверьте логи и убедитесь, что все переменные окружения настроены правильно.

