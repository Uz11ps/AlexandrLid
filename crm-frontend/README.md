# CRM Frontend

React приложение для управления CRM системой.

## Установка и запуск

### Локальная разработка

```bash
cd crm-frontend
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

### Production Build

```bash
npm run build
```

### Docker

```bash
docker-compose up crm-frontend
```

## Структура

- `src/pages/` - Страницы приложения
- `src/components/` - Переиспользуемые компоненты
- `src/api/` - API клиенты
- `src/contexts/` - React контексты (Auth и др.)

## Основные страницы

- `/login` - Страница входа
- `/` - Dashboard
- `/leads` - Список лидов
- `/leads/:id` - Карточка лида
- `/tasks` - Задачи и напоминания

