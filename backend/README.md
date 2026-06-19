# Certificate Management System — Backend

A **production-ready FastAPI** backend for generating, managing, and verifying digital certificates.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL (via asyncpg) |
| Auth | JWT (python-jose) + bcrypt |
| PDF Gen | ReportLab + Pillow |
| QR Codes | qrcode[pil] |
| Email | aiosmtplib |
| Excel | pandas + openpyxl |
| Migrations | Alembic |

## Quick Start (Local)

```bash
# 1. Create & activate virtualenv
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux / macOS

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, SMTP settings, etc.

# 4. Run database migrations
alembic upgrade head

# 5. Start the API
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Quick Start (Docker)

```bash
copy .env.example .env
# Edit .env as needed
docker-compose up --build
```

## Project Structure

```
backend/
├── alembic/               # Database migrations
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py         # Authentication
│   │       ├── audit.py        # Audit log helper
│   │       ├── certificates.py # Certificate CRUD
│   │       ├── dashboard.py    # Stats & audit logs
│   │       ├── email_router.py # Email delivery
│   │       ├── events.py       # Event management
│   │       ├── excel.py        # Excel upload & generation
│   │       ├── templates.py    # Template management
│   │       └── verification.py # Public verification
│   ├── core/
│   │   ├── config.py     # Pydantic settings
│   │   ├── database.py   # Async SQLAlchemy setup
│   │   └── security.py   # JWT + password utils
│   ├── models/           # SQLAlchemy ORM models
│   ├── schemas/          # Pydantic request/response models
│   ├── services/         # Business logic
│   │   ├── storage_service.py
│   │   ├── pdf_service.py
│   │   ├── qr_service.py
│   │   ├── email_service.py
│   │   ├── excel_service.py
│   │   └── zip_service.py
│   └── main.py           # App factory + router registration
├── storage/              # Generated files (git-ignored)
│   ├── certificates/
│   ├── qrcodes/
│   └── templates/
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## API Endpoints Overview

### Authentication `/api/v1/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Email + password → JWT |
| GET | `/me` | Current admin info |
| POST | `/register` | Create admin (requires auth) |

### Templates `/api/v1/templates`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all templates |
| POST | `/` | Upload template file (multipart) |
| GET | `/{id}` | Get template |
| PUT | `/{id}` | Update name / placeholder config |
| DELETE | `/{id}` | Delete template |
| GET | `/{id}/file` | Download template file |

### Events `/api/v1/events`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Paginated event list |
| POST | `/` | Create event |
| GET | `/{id}` | Get event |
| PUT | `/{id}` | Update event |
| DELETE | `/{id}` | Delete event + all certs |
| GET | `/{id}/status` | Generation progress |
| GET | `/{id}/download-zip` | Bulk PDF download |
| POST | `/{id}/send-emails` | Trigger bulk email |
| GET | `/{id}/email-status` | Email delivery stats |

### Excel & Generation `/api/v1`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/events/{id}/upload-excel` | Parse Excel → pending certs |
| POST | `/events/{id}/generate` | Background PDF generation |
| GET | `/events/{id}/preview` | Preview PNG |

### Certificates `/api/v1/certificates`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Filtered/paginated list |
| GET | `/{uuid}` | Get by UUID |
| GET | `/by-cert-id/{cert_id}` | Get by cert string ID |
| GET | `/{uuid}/download` | Stream PDF |
| POST | `/{uuid}/regenerate` | Regenerate PDF |
| DELETE | `/{uuid}` | Delete cert + files |
| POST | `/{uuid}/send-email` | Send email |

### Public Verification `/api/v1/verify`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/{certificate_id}` | Verify certificate (no auth) |

### Dashboard `/api/v1/dashboard`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | System-wide statistics |
| GET | `/recent-activity` | Last 20 audit log entries |
| GET | `/audit-logs` | Paginated audit logs |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | JWT signing secret |
| `DATABASE_URL` | — | Async PostgreSQL URL |
| `SYNC_DATABASE_URL` | — | Sync PostgreSQL URL (Alembic) |
| `EMAIL_ENABLED` | `False` | Enable SMTP email sending |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASSWORD` | — | SMTP password |
| `FRONTEND_URL` | `http://localhost:5173` | Used in QR verification URLs |
| `ADMIN_EMAIL` | `admin@company.com` | Seed admin email |
| `ADMIN_PASSWORD` | `admin123` | Seed admin password |

## Running Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "add_column_xyz"

# Apply all migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```
