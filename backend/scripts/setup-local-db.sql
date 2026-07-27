-- Run against your local PostgreSQL (port 5432) as superuser `postgres`
-- Creates app user + database for Thrift Store

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reloom') THEN
    CREATE ROLE reloom LOGIN PASSWORD 'reloom_secret';
  END IF;
END
$$;

SELECT 'CREATE DATABASE reloom OWNER reloom'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'reloom')\gexec

GRANT ALL PRIVILEGES ON DATABASE reloom TO reloom;

\c reloom

GRANT ALL ON SCHEMA public TO reloom;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reloom;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reloom;
