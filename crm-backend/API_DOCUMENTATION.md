# CRM Backend API Documentation

## Base URL
`http://momentumtrading.ru/api`

## Authentication
Все эндпоинты (кроме `/webforms`) требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication
- `POST /api/auth/login` - Вход в систему
  - Body: `{ email, password }`
  - Returns: `{ token, user }`

### Leads (Лиды)
- `GET /api/leads` - Список лидов (с фильтрацией и пагинацией)
  - Query params: `page`, `limit`, `status`, `funnel_stage`, `manager_id`, `search`
- `GET /api/leads/:id` - Детали лида
- `POST /api/leads` - Создать лид
- `PUT /api/leads/:id` - Обновить лид
- `POST /api/leads/:id/comments` - Добавить комментарий
- `POST /api/leads/:id/message` - Отправить сообщение в Telegram

### Students (Студенты)
- `GET /api/students` - Список студентов
  - Query params: `course_id`, `group_id`, `payment_status`
- `GET /api/students/:id` - Детали студента (с платежами и долгами)
- `POST /api/students/convert` - Конвертировать лид в студента
- `PUT /api/students/:id` - Обновить студента
- `POST /api/students/:id/payments` - Добавить платеж

### Products (Продукты)
- `GET /api/products/courses` - Список курсов
- `GET /api/products/courses/:id` - Детали курса
- `POST /api/products/courses` - Создать курс
- `PUT /api/products/courses/:id` - Обновить курс
- `GET /api/products/packages` - Список тарифов
  - Query params: `course_id`
- `POST /api/products/packages` - Создать тариф
- `GET /api/products/services` - Список дополнительных услуг
- `POST /api/products/services` - Создать услугу

### Deals (Сделки)
- `GET /api/deals` - Список сделок
  - Query params: `stage`, `manager_id`, `lead_id`
- `GET /api/deals/:id` - Детали сделки
- `POST /api/deals` - Создать сделку
- `PUT /api/deals/:id` - Обновить сделку

### Analytics (Аналитика)
- `GET /api/analytics/dashboard` - Дашборд (сводка)
- `GET /api/analytics/funnel` - Аналитика воронки продаж
  - Query params: `start_date`, `end_date`
- `GET /api/analytics/financial` - Финансовая аналитика
  - Query params: `period` (day/week/month/year)
- `GET /api/analytics/managers` - Эффективность менеджеров
- `GET /api/analytics/sources` - Аналитика по источникам

### Funnel (Воронка продаж)
- `GET /api/funnel/stages` - Список этапов воронки
- `POST /api/funnel/stages` - Создать этап
- `PUT /api/funnel/stages/:id` - Обновить этап
- `DELETE /api/funnel/stages/:id` - Удалить этап (деактивировать)
- `PUT /api/funnel/leads/:id/stage` - Изменить этап лида (для drag&drop)

### Templates (Шаблоны)
- `GET /api/templates/messages` - Список шаблонов сообщений
  - Query params: `category` (sales/education/support/objections)
- `POST /api/templates/messages` - Создать шаблон
- `PUT /api/templates/messages/:id` - Обновить шаблон
- `GET /api/templates/objections` - Библиотека ответов на возражения
- `POST /api/templates/objections` - Добавить ответ на возражение

### Documents (Документы)
- `GET /api/documents` - Список документов
  - Query params: `lead_id`, `student_id`, `deal_id`, `document_type`
- `GET /api/documents/templates` - Шаблоны документов
- `POST /api/documents/templates` - Создать шаблон документа
- `POST /api/documents` - Создать документ
- `PUT /api/documents/:id` - Обновить статус документа

### Tasks (Задачи)
- `GET /api/tasks` - Список задач
  - Query params: `manager_id`, `lead_id`, `status`
- `GET /api/tasks/:id` - Детали задачи
- `POST /api/tasks` - Создать задачу
- `PUT /api/tasks/:id` - Обновить задачу

### Web Forms (Веб-формы) - Публичный эндпоинт
- `POST /api/webforms/lead` - Создать лид из веб-формы (без авторизации)
  - Body: все поля лида (fio, phone обязательны)
- `GET /api/webforms/structure` - Структура формы для интеграции

## Примеры запросов

### Создание лида из веб-формы:
```bash
curl -X POST http://momentumtrading.ru/api/webforms/lead \
  -H "Content-Type: application/json" \
  -d '{
    "fio": "Иван Иванов",
    "phone": "+79991234567",
    "email": "ivan@example.com",
    "source": "Web Form",
    "utm_source": "google",
    "utm_medium": "cpc"
  }'
```

### Получение дашборда:
```bash
curl -X GET http://momentumtrading.ru/api/analytics/dashboard \
  -H "Authorization: Bearer <token>"
```

### Изменение этапа лида (drag&drop):
```bash
curl -X PUT http://momentumtrading.ru/api/funnel/leads/123/stage \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"funnel_stage": "Квалификация"}'
```

