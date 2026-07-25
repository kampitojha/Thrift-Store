# Database — Local PostgreSQL only

This project uses **your installed PostgreSQL**, not Docker for DB.

## Connection (for Antigravity / VS Code DB extension)

| Field | Value |
|-------|--------|
| Host | `127.0.0.1` |
| Port | **`5432`** |
| Database | `reloom` |
| User | `reloom` |
| Password | `reloom_secret` |
| SSL | Off |

```
postgresql://reloom:reloom_secret@127.0.0.1:5432/reloom
```

## One-time setup

### 1. Create DB + user (PowerShell)

```powershell
cd backend
$env:PGPASSWORD = "YOUR_POSTGRES_SUPERUSER_PASSWORD"
.\scripts\setup-local-db.ps1
```

### 2. Migrate + seed

```powershell
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 3. Prisma Studio (optional)

```powershell
npm run db:studio
```

## Stop Docker Postgres (if it was running)

```powershell
docker stop reloom-postgres
docker rm reloom-postgres
```

Optional only (Redis / search): `docker compose up -d` in `backend/` — **no Postgres container**.
