#!/bin/bash
# Скрипт для установки пароля PostgreSQL после инициализации БД
# Этот скрипт запускается после init.sql

set -e

# Читаем пароль из переменной окружения
DB_PASS="${POSTGRES_PASSWORD:-postgres}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [init_password.sh] Установка пароля PostgreSQL: [${#DB_PASS} символов]"

# Устанавливаем пароль
SQL_PASSWORD=$(echo "$DB_PASS" | sed "s/'/''/g")
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER USER postgres WITH PASSWORD '$SQL_PASSWORD';
    SELECT pg_reload_conf();
EOSQL

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [init_password.sh] ✅ Пароль установлен"

