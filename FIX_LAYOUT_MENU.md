# Исправление бокового меню в CRM

## Проблема
Боковое меню не отображалось, потому что Layout компонент использовался дважды (в App.jsx и внутри страниц).

## Решение
Layout теперь используется только в App.jsx, все страницы обернуты в Layout через роутинг.

## Что нужно сделать на сервере

```bash
cd /opt/AlexandrLid

# 1. Обновить код
git pull

# 2. Пересобрать frontend
docker compose build --no-cache crm-frontend

# 3. Перезапустить frontend
docker compose restart crm-frontend

# 4. Проверить логи
docker compose logs -f crm-frontend
```

Или использовать полный скрипт:

```bash
cd /opt/AlexandrLid
git pull
chmod +x APPLY_ALL_CHANGES.sh
./APPLY_ALL_CHANGES.sh
```

## После применения

Откройте http://momentumtrading.ru и обновите страницу (Ctrl+F5 для полной перезагрузки).

В левой панели должны появиться все пункты меню:
- Дашборд
- Лиды
- Студенты
- Сделки
- Продукты
- Задачи
- Аналитика
- Шаблоны
- Документы
- Админка бота

