# Reloom

Premium thrift marketplace.

```
Thrift-Store/
├── frontend/     # Next.js UI          → http://localhost:3000
├── backend/      # NestJS API + DB     → http://localhost:4000
└── README.md
```

Frontend aur backend **alag projects** hain. Root pe koi monorepo / shared package nahi.

---

## Backend

Uses **your local PostgreSQL** (port **5432**), not Docker for DB.

```bash
cd backend
cp .env.example .env
npm install

# One-time: create reloom DB on local Postgres (PowerShell)
# $env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
# .\scripts\setup-local-db.ps1

npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev          # → http://localhost:4000
```

Optional (Redis/search only): `npm run docker:up` — **no Postgres container**.

Swagger: http://localhost:4000/docs  

Seed login: `seller@reloom.com` / `Reloom@123`

DB extension connection: see `backend/DATABASE.md`  
`postgresql://reloom:reloom_secret@127.0.0.1:5432/reloom`

---

## Frontend

```bash
cd frontend
cp .env.example .env.local
npm install          # or pnpm install
npm run dev          # → http://localhost:3000
```

`NEXT_PUBLIC_API_URL` backend URL point kare (default `http://localhost:4000`).

---

## Rules

- `frontend/` → sirf UI, backend code import mat karo
- `backend/` → sirf API, React/Next import mat karo
- Dono HTTP se baat karte hain
