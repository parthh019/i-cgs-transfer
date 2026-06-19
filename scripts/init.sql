-- CertifyPro Database Initialization Script
-- This runs automatically when PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if not exists (usually handled by Docker env vars)
-- The tables will be created by SQLAlchemy / Alembic migrations

-- Create indexes that may not be auto-generated
-- (Tables created by app on startup)

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE certdb TO postgres;
