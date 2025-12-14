# Исправление 502 Bad Gateway через домен

## Проблема:
Локально все работает (`curl http://localhost/api/health` и `curl http://localhost/`), но через домен `momentumtrading.ru` получаем 502 Bad Gateway.

## Возможные причины:
1. DNS не настроен правильно
2. Запросы приходят на другой сервер/порт
3. Проблема с firewall
4. REG.RU панель перехватывает запросы

## Решение:

### 1. Проверка работы через домен на сервере

```bash
# Проверка через домен локально на сервере
curl http://momentumtrading.ru/api/health
curl http://momentumtrading.ru/

# Проверка через IP
curl -H "Host: momentumtrading.ru" http://95.163.227.114/api/health
curl -H "Host: momentumtrading.ru" http://95.163.227.114/
```

### 2. Проверка DNS настроек

```bash
# Проверка DNS записи
nslookup momentumtrading.ru
dig momentumtrading.ru

# Должно указывать на IP: 95.163.227.114
```

### 3. Проверка конфигурации REG.RU панели

Если домен управляется через панель REG.RU, нужно:

1. Зайти в панель управления REG.RU
2. Найти настройки домена `momentumtrading.ru`
3. Настроить DNS записи:
   - A запись: `momentumtrading.ru` → `95.163.227.114`
   - A запись: `www.momentumtrading.ru` → `95.163.227.114`
4. Отключить веб-сервер в панели REG.RU (если он там включен)

### 4. Проверка firewall

```bash
# Проверка правил firewall
ufw status
iptables -L -n | grep :80

# Если firewall активен, убедитесь что порт 80 открыт
ufw allow 80/tcp
ufw allow 443/tcp
```

### 5. Проверка логов Nginx при запросе через домен

```bash
# В одном терминале смотрите логи
tail -f /var/log/nginx/momentumtrading_error.log
tail -f /var/log/nginx/momentumtrading_access.log

# В другом терминале или браузере откройте http://momentumtrading.ru
# Смотрите, что появляется в логах
```

### 6. Альтернативное решение: использование IP напрямую

Если DNS еще не настроен, можно временно использовать IP:

```bash
# Добавление записи в /etc/hosts для тестирования (только на вашем компьютере)
# НЕ на сервере!

# На вашем локальном компьютере добавьте в файл hosts:
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/Mac: /etc/hosts
# 
# 95.163.227.114 momentumtrading.ru
```

### 7. Проверка, что Nginx слушает на всех интерфейсах

```bash
# Проверка, что Nginx слушает на 0.0.0.0:80
ss -tulpn | grep :80

# Должно быть что-то вроде:
# 0.0.0.0:80 или *:80
```

### 8. Если REG.RU панель перехватывает запросы

Возможно, в панели REG.RU есть свой веб-сервер, который перехватывает запросы. Нужно:

1. Зайти в панель управления REG.RU
2. Найти настройки хостинга для домена
3. Отключить веб-сервер или настроить его для проксирования на ваш сервер

## Проверка после исправления:

```bash
# На сервере
curl http://momentumtrading.ru/api/health
curl http://momentumtrading.ru/

# Из браузера (после настройки DNS)
# Откройте: http://momentumtrading.ru
# Должна открыться страница входа в CRM
```

