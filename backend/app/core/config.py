from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Certificate Management System"
    DEBUG: bool = False
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "certdb"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/certdb"
    SYNC_DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/certdb"

    # Storage
    STORAGE_BACKEND: str = "local"  # local or s3
    STORAGE_BASE_PATH: str = "storage"

    # S3 (optional)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "us-east-1"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "Certificate Management System"
    EMAIL_ENABLED: bool = False

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Admin seed
    ADMIN_EMAIL: str = "admin@company.com"
    ADMIN_PASSWORD: str = "admin123"
    ADMIN_NAME: str = "System Admin"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
