#!/bin/bash

echo "=== Исправление миграции и проверка API ==="

# 1. Удаление неправильно созданных таблиц
echo "1. Удаление таблиц с ошибками..."
docker compose exec -T postgres psql -U postgres -d telegram_bot_db << 'EOF'
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
EOF

# 2. Применение исправленной миграции
echo "2. Применение исправленной миграции..."
docker compose cp init_crm_extended.sql postgres:/tmp/init_crm_extended.sql
docker compose exec -T postgres psql -U postgres -d telegram_bot_db -f /tmp/init_crm_extended.sql

# 3. Проверка таблиц
echo "3. Проверка созданных таблиц..."
docker compose exec -T postgres psql -U postgres -d telegram_bot_db -c "\dt" | grep -E "(courses|packages|students|deals|payments)"

# 4. Перезапуск бэкенда
echo "4. Перезапуск CRM Backend..."
docker compose restart crm-backend
sleep 3

# 5. Проверка API
echo "5. Проверка работы API..."
echo "Проверка /health (локально):"
curl -s http://localhost:3001/health || echo "❌ Backend не отвечает"

echo ""
echo "Проверка /api/health (через Nginx):"
curl -s http://localhost/api/health || echo "❌ Nginx не проксирует запросы"

echo ""
echo "=== Готово! ==="

