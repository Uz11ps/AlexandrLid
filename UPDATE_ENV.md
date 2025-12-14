# Обновление ADMIN_IDS в .env

## Способ 1: Использование скрипта (рекомендуется)

```bash
cd /opt/AlexandrLid
git pull
chmod +x UPDATE_ADMIN_IDS.sh
./UPDATE_ADMIN_IDS.sh
```

## Способ 2: Ручное редактирование

```bash
cd /opt/AlexandrLid

# Откройте .env файл
nano .env

# Найдите строку ADMIN_IDS и замените на:
ADMIN_IDS=916948327,674625025,6700918468,8005344926

# Или добавьте эту строку, если её нет

# Сохраните файл (Ctrl+O, Enter, Ctrl+X)

# Перезапустите бота
docker compose restart bot
```

## Способ 3: Через sed (быстро)

```bash
cd /opt/AlexandrLid

# Если строка уже существует - обновить
sed -i 's/^ADMIN_IDS=.*/ADMIN_IDS=916948327,674625025,6700918468,8005344926/' .env

# Если строки нет - добавить
if ! grep -q "ADMIN_IDS=" .env; then
    echo "ADMIN_IDS=916948327,674625025,6700918468,8005344926" >> .env
fi

# Перезапустить бота
docker compose restart bot
```

## Проверка

```bash
# Проверить текущее значение
grep ADMIN_IDS .env

# Проверить логи бота
docker compose logs bot | tail -20
```

