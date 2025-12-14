# CRM Backend API

Backend API для CRM системы, интегрированной с Telegram ботом.

## Установка и запуск

### Локальная разработка

```bash
cd crm-backend
npm install
cp .env.example .env
# Отредактируйте .env файл
npm run dev
```

### Docker

```bash
docker-compose up crm-backend
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Вход в систему

### Leads
- `GET /api/leads` - Список лидов (с фильтрацией и пагинацией)
- `GET /api/leads/:id` - Детали лида
- `POST /api/leads` - Создать лида
- `PUT /api/leads/:id` - Обновить лида
- `POST /api/leads/:id/comments` - Добавить комментарий
- `POST /api/leads/:id/message` - Отправить сообщение в Telegram

### Tasks
- `GET /api/tasks` - Список задач
- `GET /api/tasks/:id` - Детали задачи
- `POST /api/tasks` - Создать задачу
- `PUT /api/tasks/:id` - Обновить задачу
- `DELETE /api/tasks/:id` - Удалить задачу

## Переменные окружения

- `DB_HOST` - Хост базы данных
- `DB_PORT` - Порт базы данных
- `DB_NAME` - Имя базы данных
- `DB_USER` - Пользователь БД
- `DB_PASSWORD` - Пароль БД
- `PORT` - Порт сервера (по умолчанию 3001)
- `BOT_TOKEN` - Токен Telegram бота
- `JWT_SECRET` - Секретный ключ для JWT

