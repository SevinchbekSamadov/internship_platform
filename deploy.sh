#!/bin/bash
# Serverga deploy qilish skripti
# Ishlatish: bash deploy.sh

set -e

echo "=== DEPLOY BOSHLANDI ==="

# Eng yangi kodni olish
git pull origin main

# Docker konteynerlarni qayta qurish
docker compose down
docker compose up --build -d

# Migratsiyalar
echo "Migratsiyalar amalga oshirilmoqda..."
docker compose exec -T backend python manage.py migrate --noinput

# Static fayllar
docker compose exec -T backend python manage.py collectstatic --noinput

echo "=== DEPLOY YAKUNLANDI ==="
echo "Platforma: http://$(hostname -I | awk '{print $1}')"
