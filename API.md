# API Documentation

## Обзор

Данный документ описывает API эндпоинты CRM системы и логику их работы. Система состоит из Telegram бота и веб-интерфейса CRM.

## Аутентификация

Все эндпоинты CRM требуют JWT токен в заголовке:
```
Authorization: Bearer <token>
```

Токен получается через `/api/auth/login` с email и password менеджера.

## Структура базы данных

### Основные таблицы:
- `users` - Пользователи Telegram бота
- `leads` - Лиды (потенциальные клиенты)
- `students` - Студенты (конвертированные лиды)
- `managers` - Менеджеры CRM системы
- `tasks` - Задачи и напоминания
- `tickets` - Тикеты поддержки
- `courses` - Курсы
- `course_tariffs` - Тарифы курсов
- `deals` - Сделки
- `payments` - Платежи
- `lead_interactions` - История взаимодействий с лидами
- `funnel_stages` - Этапы воронки продаж

## Эндпоинты

### Аутентификация (`/api/auth`)

#### POST `/api/auth/login`
Авторизация менеджера в системе.

**Request Body:**
```json
{
  "email": "manager@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "manager@example.com",
    "name": "Иван Иванов",
    "role": "admin"
  }
}
```

---

### Лиды (`/api/leads`)

#### GET `/api/leads`
Получить список лидов с фильтрацией и пагинацией.

**Query Parameters:**
- `page` (number, default: 1) - Номер страницы
- `limit` (number, default: 50) - Количество на странице
- `status` (string) - Фильтр по статусу
- `funnel_stage` (string) - Фильтр по этапу воронки
- `manager_id` (number) - Фильтр по менеджеру
- `search` (string) - Поиск по ФИО, телефону, email, telegram

**Response:**
```json
{
  "leads": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### GET `/api/leads/:id`
Получить детальную информацию о лиде.

**Response включает:**
- Основная информация лида
- Комментарии менеджеров (`comments`)
- История переписки (`interactions`)

#### POST `/api/leads`
Создать нового лида вручную.

**Request Body:**
```json
{
  "fio": "Иван Иванов",
  "phone": "+79001234567",
  "email": "ivan@example.com",
  "telegram_username": "ivan_ivanov",
  "source": "Manual",
  "notes": "Заметки о лиде"
}
```

#### PUT `/api/leads/:id`
Обновить информацию о лиде.

**Request Body:** Любые поля из таблицы `leads` (fio, phone, email, status, funnel_stage, priority, notes и т.д.)

#### DELETE `/api/leads/:id`
Удалить лида.

#### GET `/api/leads/export/excel`
Экспортировать лиды в Excel.

**Query Parameters:** Те же, что и для GET `/api/leads` (для фильтрации)

**Response:** Excel файл (.xlsx)

#### POST `/api/leads/:id/comments`
Добавить комментарий к лиду.

**Request Body:**
```json
{
  "comment_text": "Текст комментария"
}
```

#### POST `/api/leads/:id/message`
Отправить сообщение лиду через Telegram бота.

**Request Body:**
```json
{
  "message_text": "Текст сообщения"
}
```

---

### Студенты (`/api/students`)

#### GET `/api/students`
Получить список студентов.

**Query Parameters:**
- `course_id` (number) - Фильтр по курсу
- `group_id` (number) - Фильтр по группе
- `payment_status` (string) - Фильтр по статусу оплаты

#### GET `/api/students/:id`
Получить детальную информацию о студенте (включая платежи и задолженности).

#### GET `/api/students/export/excel`
Экспортировать студентов в Excel.

**Response:** Excel файл (.xlsx)

#### POST `/api/students/convert`
Конвертировать лида в студента.

**Request Body:**
```json
{
  "lead_id": 1,
  "course_id": 1,
  "package_id": 1,
  "payment_amount": 50000,
  "payment_method": "crypto",
  "contract_number": "CONTRACT-001"
}
```

---

### Задачи (`/api/tasks`)

#### GET `/api/tasks`
Получить список задач.

**Query Parameters:**
- `manager_id` (number) - Фильтр по менеджеру
- `lead_id` (number) - Фильтр по лиду
- `status` (string) - Фильтр по статусу (new, in_progress, completed)
- `task_type` (string) - Фильтр по типу задачи
- `date_filter` (string) - Фильтр по дате (today, tomorrow, upcoming)
- `due_date_from` (date) - Начало периода
- `due_date_to` (date) - Конец периода

#### GET `/api/tasks/:id`
Получить детальную информацию о задаче.

#### POST `/api/tasks`
Создать новую задачу.

**Request Body:**
```json
{
  "lead_id": 1,
  "manager_id": 1,
  "title": "Название задачи",
  "description": "Описание",
  "task_type": "reminder",
  "due_date": "2024-12-20T12:00:00",
  "due_time": "14:00",
  "priority": "normal"
}
```

#### PUT `/api/tasks/:id`
Обновить задачу (включая изменение статуса).

#### DELETE `/api/tasks/:id`
Удалить задачу.

---

### Воронка продаж (`/api/funnel`)

#### GET `/api/funnel/stages`
Получить все этапы воронки.

#### POST `/api/funnel/stages`
Создать новый этап воронки.

**Request Body:**
```json
{
  "name": "Новый этап",
  "order_index": 5,
  "color": "#3498db"
}
```

#### PUT `/api/funnel/stages/:id`
Обновить этап воронки.

#### DELETE `/api/funnel/stages/:id`
Удалить этап воронки (soft delete - устанавливает is_active = false).

#### PUT `/api/funnel/leads/:leadId/stage`
Изменить этап воронки для лида.

**Request Body:**
```json
{
  "stage": "Название этапа"
}
```

---

### Продукты (`/api/products`)

#### GET `/api/products/courses`
Получить список курсов (без тарифов).

#### GET `/api/products/courses/:id`
Получить детальную информацию о курсе с тарифами.

**Response включает:**
- Информация о курсе
- Массив `tariffs` с тарифами курса

#### POST `/api/products/courses`
Создать новый курс.

**Request Body:**
```json
{
  "name": "Название курса",
  "description": "Описание",
  "format": "online",
  "duration_weeks": 12,
  "status": "active"
}
```

#### PUT `/api/products/courses/:id`
Обновить курс.

#### GET `/api/products/courses/:courseId/tariffs`
Получить тарифы курса.

#### POST `/api/products/courses/:courseId/tariffs`
Создать тариф для курса.

**Request Body:**
```json
{
  "name": "Базовый",
  "description": "Описание тарифа",
  "price": 50000,
  "currency": "RUB",
  "features": ["Доступ к материалам", "Поддержка"],
  "installment_available": false,
  "order_index": 0
}
```

#### PUT `/api/products/tariffs/:id`
Обновить тариф.

#### DELETE `/api/products/tariffs/:id`
Удалить тариф (soft delete - устанавливает is_active = false).

---

### Аналитика (`/api/analytics`)

#### GET `/api/analytics/funnel`
Получить аналитику по воронке продаж.

**Query Parameters:**
- `period` (string) - Период (day, week, month, year)
- `start_date` (date) - Начало периода
- `end_date` (date) - Конец периода

#### GET `/api/analytics/financial`
Получить финансовую аналитику.

**Query Parameters:**
- `period` (string, default: 'month') - Период (day, week, month, year)

**Response:**
```json
{
  "revenue": {
    "total_revenue": 1000000,
    "transaction_count": 50,
    "average_check": 20000
  },
  "by_source": [...],
  "active_students": 25,
  "trend": [...]
}
```

#### GET `/api/analytics/managers`
Получить эффективность менеджеров.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "leads_count": 50,
    "leads_30d": 10,
    "converted_count": 5,
    "sales_count": 5,
    "total_revenue": 250000,
    "tasks_completed": 7,
    "tasks_total": 10
  }
]
```

#### GET `/api/analytics/manager-efficiency`
Получить детальную эффективность менеджеров (включая конверсию).

#### GET `/api/analytics/sources`
Получить аналитику по источникам лидов.

**Query Parameters:**
- `period` (string) - Период фильтрации

#### GET `/api/analytics/user-activity`
Получить активность пользователей.

**Query Parameters:**
- `period` (string, default: 'month') - Период

---

### Тикеты (`/api/tickets`)

#### GET `/api/tickets`
Получить список тикетов.

**Query Parameters:**
- `status` (string) - Фильтр по статусу
- `manager_id` (number) - Фильтр по менеджеру
- `user_id` (number) - Фильтр по пользователю

#### GET `/api/tickets/:id`
Получить тикет с сообщениями.

#### POST `/api/tickets`
Создать новый тикет.

**Request Body:**
```json
{
  "user_id": 123456789,
  "subject": "Тема тикета",
  "priority": "normal"
}
```

#### POST `/api/tickets/:id/messages`
Отправить сообщение в тикет (от менеджера).

**Request Body:**
```json
{
  "message_text": "Текст сообщения"
}
```

**Примечание:** Если тикет закрыт, он автоматически переоткрывается при добавлении сообщения.

#### PUT `/api/tickets/:id`
Обновить тикет (статус, менеджера, приоритет).

**Request Body:**
```json
{
  "status": "closed",
  "manager_id": 1,
  "priority": "high"
}
```

---

### Документы (`/api/documents`)

#### GET `/api/documents`
Получить список документов.

#### GET `/api/documents/:id`
Получить детальную информацию о документе.

#### POST `/api/documents`
Создать документ.

**Request Body:**
```json
{
  "document_type": "contract",
  "lead_id": 1,
  "file_name": "contract.pdf"
}
```

#### PUT `/api/documents/:id`
Обновить документ (включая загрузку файла через base64).

**Request Body:**
```json
{
  "file_path": "base64_encoded_file_data",
  "file_name": "contract.pdf",
  "file_size": 1024,
  "mime_type": "application/pdf"
}
```

#### GET `/api/documents/:id/download`
Скачать файл документа.

#### DELETE `/api/documents/:id`
Удалить документ.

---

## Логика работы системы

### Создание лидов

Лиды создаются автоматически в следующих случаях:
1. **При регистрации пользователя в боте** (`/start`) - создается лид с источником "Telegram Bot"
2. **При подписке на канал** - создается/обновляется лид с источником "Channel Subscription"
3. **Вручную через CRM** - создается лид с источником "Manual"

### История переписки

Все сообщения от пользователей в боте автоматически сохраняются в таблицу `lead_interactions`:
- Текстовые сообщения (`bot.on('text')`)
- Фото с подписями (`bot.on('photo')`)
- Видео с подписями (`bot.on('video')`)
- Документы (`bot.on('document')`)

Тип взаимодействия: `telegram_message`
Данные сохраняются в JSONB поле `interaction_data`:
```json
{
  "text": "Текст сообщения",
  "type": "text|photo|video|document",
  "file_id": "telegram_file_id",
  "file_name": "имя_файла"
}
```

### Тикеты

**Создание тикета:**
- Пользователь может создать тикет через команду `/ticket` или `/ticket_new` в боте
- Менеджер может создать тикет через веб-интерфейс

**Ответ на закрытый тикет:**
- Если пользователь отвечает на закрытый тикет, он автоматически переоткрывается (статус меняется на `open`)
- Сообщение сохраняется в `ticket_messages`
- В веб-интерфейсе сообщение отображается корректно

**Отправка сообщений:**
- Сообщения от менеджера в веб-интерфейсе автоматически отправляются пользователю в Telegram через бота
- Сообщения от пользователя в боте сохраняются в тикет

### Воронка продаж

**Этапы воронки:**
- Этапы настраиваются через `/api/funnel/stages`
- Каждый этап имеет `order_index` для сортировки
- Лиды можно перетаскивать между этапами в Kanban-доске

**Изменение этапа:**
- При изменении этапа создается запись в `lead_interactions` с типом `stage_change`
- Обновляется поле `funnel_stage` в таблице `leads`

### Задачи и напоминания

**Типы задач:**
- `reminder` - Напоминание (используется в LeadDetail)
- `call` - Звонок
- `send_materials` - Отправить материалы
- `presentation` - Презентация
- `custom` - Кастомная задача

**Статусы задач:**
- `new` - Новая
- `in_progress` - В работе
- `completed` - Выполнена
- `cancelled` - Отменена

**Kanban-доска:**
- Задачи можно перетаскивать между колонками (new → in_progress → completed)
- Используется библиотека `@hello-pangea/dnd`

### Курсы и тарифы

**Структура:**
- Курс содержит основную информацию (название, описание, формат, длительность)
- Тарифы привязаны к курсу через `course_tariffs` (один курс - много тарифов)
- Тарифы имеют цену, описание, список возможностей (features)

**Отображение:**
- В списке курсов колонка "Цена" удалена
- При клике на курс открывается страница деталей с тарифами
- Тарифы управляются внутри страницы курса

### Экспорт данных

**Формат экспорта:**
- Excel (.xlsx) через библиотеку `exceljs`
- Экспорт лидов включает все основные поля
- Экспорт студентов включает информацию о курсе, тарифе, платежах

**Использование:**
- Кнопка "Экспорт в Excel" в интерфейсе LeadsList и Students
- Фильтры применяются к экспортируемым данным

---

## Взаимосвязи между модулями

```
users (Telegram Bot)
  ↓
leads (CRM)
  ↓
students (конвертация лида)
  ↓
payments (платежи студента)
  ↓
deals (сделки)

managers (CRM Users)
  ↓
leads (назначенные лиды)
  ↓
tasks (задачи менеджера)
  ↓
tickets (тикеты менеджера)

courses
  ↓
course_tariffs (тарифы курса)
  ↓
students (студенты на курсе)
```

---

## Обработка ошибок

Все эндпоинты возвращают стандартные HTTP коды:
- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

Формат ошибки:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## Безопасность

1. **JWT токены** - все запросы к CRM требуют валидный токен
2. **Проверка прав доступа** - менеджеры видят только свои тикеты/лиды (если не админ)
3. **Валидация данных** - все входные данные валидируются на бэкенде
4. **SQL инъекции** - используются параметризованные запросы (prepared statements)

---

## Примечания для разработчиков

### Добавление нового эндпоинта

1. Создать роут в соответствующем файле `crm-backend/routes/*.js`
2. Добавить middleware `authenticateToken` для проверки авторизации
3. Добавить валидацию входных данных
4. Использовать параметризованные SQL запросы
5. Обработать ошибки с правильными HTTP кодами
6. Обновить документацию (API.md)

### Добавление нового поля в таблицу

1. Обновить `init.sql` или соответствующий миграционный файл
2. Обновить эндпоинты для работы с новым полем
3. Обновить фронтенд компоненты для отображения/редактирования поля
4. Обновить документацию

### Работа с Drag & Drop

Используется библиотека `@hello-pangea/dnd`:
- Обернуть список в `DragDropContext`
- Каждая колонка - `Droppable`
- Каждый элемент - `Draggable`
- Обработчик `onDragEnd` обновляет данные через API

---

## Контакты и поддержка

Для вопросов по API обращайтесь к разработчикам проекта.

