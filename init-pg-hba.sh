#!/bin/sh
set -e

# Настройка pg_hba.conf для разрешения подключений из Docker сети
echo "host    all             all             0.0.0.0/0               scram-sha-256" >> /var/lib/postgresql/data/pg_hba.conf
echo "host    all             all             ::/0                    scram-sha-256" >> /var/lib/postgresql/data/pg_hba.conf

# Перезагрузка конфигурации PostgreSQL
psql -U postgres -c "SELECT pg_reload_conf();"

echo "pg_hba.conf обновлен для разрешения подключений из Docker сети"

