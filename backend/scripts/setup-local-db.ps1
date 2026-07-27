# Setup Thrift Store DB on LOCAL PostgreSQL (not Docker)
# Usage (PowerShell):
#   $env:PGPASSWORD = "your_postgres_password"
#   .\scripts\setup-local-db.ps1

$ErrorActionPreference = "Stop"
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
if (-not (Test-Path "$pgBin\psql.exe")) {
  $pgBin = "C:\Program Files\PostgreSQL\16\bin"
}
if (-not (Test-Path "$pgBin\psql.exe")) {
  Write-Host "psql not found. Install PostgreSQL or fix path." -ForegroundColor Red
  exit 1
}

$env:PGUSER = if ($env:PGUSER) { $env:PGUSER } else { "postgres" }
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGDATABASE = "postgres"

if (-not $env:PGPASSWORD) {
  Write-Host "Set password first:" -ForegroundColor Yellow
  Write-Host '  $env:PGPASSWORD = "your_postgres_password"'
  exit 1
}

$psql = Join-Path $pgBin "psql.exe"
Write-Host "Creating role + database on local Postgres..." -ForegroundColor Cyan

& $psql -v ON_ERROR_STOP=1 -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reloom') THEN CREATE ROLE reloom LOGIN PASSWORD 'reloom_secret'; END IF; END `$`$;"
& $psql -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname = 'reloom'" | ForEach-Object {
  if ($_.Trim() -ne "1") {
    & $psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE reloom OWNER reloom;"
  }
}
& $psql -v ON_ERROR_STOP=1 -d reloom -c "GRANT ALL ON SCHEMA public TO reloom; ALTER SCHEMA public OWNER TO reloom;"

Write-Host "Done. Connection string:" -ForegroundColor Green
Write-Host "postgresql://reloom:reloom_secret@127.0.0.1:5432/reloom?schema=public"
Write-Host ""
Write-Host "Next:"
Write-Host "  cd backend"
Write-Host "  npm run db:generate"
Write-Host "  npm run db:migrate"
Write-Host "  npm run db:seed"
