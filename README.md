# Amaliyot Tizimi

Talabalar ishlab chiqarish amaliyotini boshqarish uchun veb-platforma.

**Stack:** Django REST Framework · React.js 18 · PostgreSQL 15 · Nginx · Docker

---

## Lokal ishga tushirish

### Talab: Python 3.11+, Node.js 18+, PostgreSQL

```bash
# 1. Backend
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

pip install -r requirements.txt

cp .env.example .env            # .env ni to'ldiring
python manage.py migrate
python manage.py runserver

# 2. Frontend (yangi terminal)
cd frontend
npm install
npm start
```

---

## Docker bilan ishga tushirish (tavsiya etiladi)

```bash
# 1. .env fayl yarating
cp backend/.env.example backend/.env
# backend/.env ni tahrirlang

# 2. Ishga tushirish
docker compose up --build -d

# 3. Migratsiya (birinchi marta)
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Platforma: http://localhost

---

## Muhit o'zgaruvchilari (backend/.env)

| Kalit | Tavsif |
|-------|--------|
| `SECRET_KEY` | Django maxfiy kalit |
| `DEBUG` | `True` (lokal) / `False` (server) |
| `ALLOWED_HOSTS` | Vergul bilan ajratilgan domenlar |
| `DB_NAME` | PostgreSQL bazasi nomi |
| `DB_USER` | PostgreSQL foydalanuvchi |
| `DB_PASSWORD` | PostgreSQL parol |
| `DB_HOST` | `db` (Docker) / `localhost` (lokal) |
| `CORS_ALLOWED_ORIGINS` | Frontend URL |

---

## Arxitektura

```
Foydalanuvchi → Nginx :80 → React.js (frontend)
                           → Django API (backend:8000)
                                      → PostgreSQL (db:5432)
```

## Foydalanuvchi rollari

`student` · `company_hr` · `mentor` · `supervisor` · `kafedra` · `dekanat` · `admin`
