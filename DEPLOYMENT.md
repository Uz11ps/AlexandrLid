# Инструкция по развертыванию проекта

## Расположение файлов на хостинге

Проект развернут на сервере с доменом `momentumtrading.ru`.

### Структура файлов

При использовании ISPmanager или аналогичных панелей управления, файлы проекта обычно находятся в следующих директориях:

#### Основные директории:

1. **Telegram Bot** (Node.js приложение):
   - Путь: `/var/www/momentumtrading.ru/bot/` или `/home/momentumtrading.ru/bot/`
   - Содержит:
     - `src/` - исходный код бота
     - `package.json` - зависимости
     - `.env` - переменные окружения

2. **CRM Backend** (Node.js Express API):
   - Путь: `/var/www/momentumtrading.ru/crm-backend/` или `/home/momentumtrading.ru/crm-backend/`
   - Содержит:
     - `routes/` - API endpoints
     - `server.js` - основной файл сервера
     - `package.json` - зависимости
     - `.env` - переменные окружения

3. **CRM Frontend** (React приложение):
   - Путь: `/var/www/momentumtrading.ru/crm-frontend/` или `/home/momentumtrading.ru/crm-frontend/`
   - Содержит:
     - `src/` - исходный код React приложения
     - `public/` - статические файлы
     - `package.json` - зависимости
   - После сборки (`npm run build`) файлы находятся в `build/` или `dist/`

4. **База данных PostgreSQL**:
   - Обычно управляется через ISPmanager или напрямую через PostgreSQL
   - Файлы БД находятся в системной директории PostgreSQL (обычно `/var/lib/postgresql/`)

5. **Nginx конфигурация**:
   - Путь: `/etc/nginx/sites-available/momentumtrading.ru` или `/etc/nginx/conf.d/momentumtrading.ru.conf`
   - Содержит настройки reverse proxy для фронтенда и бэкенда

### Как найти файлы в ISPmanager:

1. **Через файловый менеджер ISPmanager**:
   - Войдите в панель управления ISPmanager
   - Перейдите в раздел "Файлы" или "File Manager"
   - Найдите домен `momentumtrading.ru`
   - Файлы должны быть в директории пользователя, например:
     - `/home/username/momentumtrading.ru/`
     - `/var/www/username/momentumtrading.ru/`

2. **Через SSH**:
   ```bash
   # Подключитесь к серверу
   ssh user@momentumtrading.ru
   
   # Найдите директории проекта
   find /home -name "package.json" -type f 2>/dev/null | grep -E "(bot|crm)"
   find /var/www -name "package.json" -type f 2>/dev/null | grep -E "(bot|crm)"
   ```

3. **Проверка через процессы**:
   ```bash
   # Найдите запущенные Node.js процессы
   ps aux | grep node
   
   # Найдите процессы по портам
   netstat -tlnp | grep -E "(3000|3001|5000|5001)"
   ```

### Docker контейнеры (если используется Docker):

Если проект развернут через Docker, файлы могут находиться в:
- `/var/lib/docker/volumes/` - данные контейнеров
- Конфигурация Docker Compose обычно в корне проекта

### Переменные окружения (.env файлы):

Файлы `.env` находятся в корневых директориях каждого компонента:
- `bot/.env` - настройки бота (BOT_TOKEN, ADMIN_IDS, DATABASE_URL)
- `crm-backend/.env` - настройки API (DATABASE_URL, JWT_SECRET, BOT_TOKEN)
- `crm-frontend/.env` - настройки фронтенда (REACT_APP_API_URL)

### Логи:

Логи приложений обычно находятся в:
- `/var/log/` - системные логи
- `bot/logs/` или `crm-backend/logs/` - логи приложений (если настроено)
- Docker логи: `docker logs <container_name>`

### Рекомендации:

1. **Для модификации интерфейса веб-админки**:
   - Файлы фронтенда: `crm-frontend/src/pages/`
   - После изменений необходимо выполнить `npm run build` в директории `crm-frontend/`
   - Собранные файлы из `build/` должны быть доступны через Nginx

2. **Для изменения логики бота**:
   - Файлы бота: `bot/src/`
   - После изменений необходимо перезапустить процесс бота

3. **Для изменения API endpoints**:
   - Файлы бэкенда: `crm-backend/routes/`
   - После изменений необходимо перезапустить процесс API

### Проверка расположения файлов:

Выполните следующие команды для проверки:

```bash
# Найдите все package.json файлы
find /home /var/www -name "package.json" 2>/dev/null

# Найдите все .env файлы
find /home /var/www -name ".env" 2>/dev/null

# Проверьте запущенные процессы
pm2 list  # если используется PM2
docker ps  # если используется Docker
```

### Важно:

- В ISPmanager файлы могут быть в директории пользователя, а не в стандартных `/var/www/`
- Проверьте права доступа к файлам
- Убедитесь, что у пользователя есть права на чтение/запись в директориях проекта

