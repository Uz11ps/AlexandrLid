# Telegram Referral Bot

Telegram-бот с реферальной системой, админ-панелью и функционалом рассылок.

## Технологии

- Node.js 20+
- Telegraf.js 4.x
- PostgreSQL 16
- Docker & Docker Compose

## Быстрый старт

### 1. Клонирование и настройка

```bash
# Установите зависимости
npm install

# Скопируйте файл с переменными окружения
cp .env.example .env

# Отредактируйте .env и укажите:
# - BOT_TOKEN (получите у @BotFather)
# - BOT_USERNAME (имя бота без @)
# - ADMIN_IDS (ID администраторов через запятую)
```

### 2. Запуск через Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f bot

# Остановка
docker-compose down
```

### 3. Запуск без Docker (для разработки)

```bash
# Убедитесь, что PostgreSQL запущен локально
# Обновите DB_HOST в .env на localhost

npm start
```

## Основные команды бота

### Для пользователей:
- `/start` - Регистрация и получение лид-магнита
- `/profile` - Личный кабинет с реферальной ссылкой
- `/help` - Справка

### Для администраторов:
- `/stats` - Статистика бота
- `/export [all|active|refs]` - Экспорт данных в CSV
- `/broadcast <текст>` - Массовая рассылка
- `/confirm_broadcast` - Подтверждение рассылки

## Структура проекта

```
├── src/
│   ├── bot.js              # Главный файл бота
│   ├── db.js               # Работа с базой данных
│   ├── handlers/           # Обработчики команд
│   │   ├── onboarding.js   # Команда /start
│   │   ├── profile.js      # Команда /profile
│   │   └── admin.js        # Админ-команды
│   └── middlewares/        # Middleware
│       ├── auth.js         # Проверка прав администратора
│       └── rateLimit.js    # Защита от спама
├── init.sql                # SQL-схема базы данных
├── docker-compose.yml      # Docker Compose конфигурация
├── Dockerfile              # Docker образ бота
└── package.json            # Зависимости проекта
```

## База данных

База данных автоматически инициализируется при первом запуске через `init.sql`.

### Таблицы:
- `users` - Пользователи бота
- `referrals` - Реферальные связи

## Разработка

```bash
# Режим разработки с автоперезагрузкой
npm run dev

# Просмотр логов PostgreSQL
docker-compose logs -f postgres
```

## Лицензия

ISC



