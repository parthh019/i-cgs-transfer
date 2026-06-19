# CertifyPro — Certificate Management System

<div align="center">
  <h3>Production-ready Certificate Management System for training and workshop companies</h3>
  <p>FastAPI · React · PostgreSQL · ReportLab · Docker</p>
</div>

---

## Features

- 🔐 **JWT Authentication** — Secure admin login with protected routes
- 🎨 **Template Management** — Upload PNG/JPG/PDF templates, configure placeholder positions visually
- 📊 **Excel Import** — Bulk attendee import from `.xlsx` with validation and preview
- 📄 **PDF Generation** — High-quality certificate PDFs with custom fonts, colors, and alignment
- 📮 **QR Code Verification** — Every certificate gets a scannable QR code linking to the verification portal
- 📦 **ZIP Download** — Download all event certificates in one click
- ✉️ **Email Delivery** — Send certificates via Gmail SMTP with delivery tracking
- 🔍 **Public Verification** — Search certificates by ID to verify authenticity
- 📈 **Dashboard** — Real-time stats, audit logs, and activity monitoring
- 🌓 **Dark/Light Mode** — Full theme support
- 🐳 **Docker Ready** — One-command deployment

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### 1. Clone and Configure
```bash
git clone <repo-url>
cd I_CGS
cp .env.example .env
# Edit .env with your settings
```

### 2. Start with Docker Compose
```bash
docker-compose up -d
```

The app will be available at:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Default Admin Credentials
```
Email: admin@company.com
Password: admin123
```
> ⚠️ Change these immediately in production via `.env`

---

## Local Development

From the repository root, start both apps together with:

```bash
npm run dev
```

That launches:
- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:8000`

If you want just one side:

```bash
npm run dev:frontend
npm run dev:backend
```

Note: the frontend dev command serves the current `frontend/dist` bundle through a small local Node server and proxies `/api` to the backend. That avoids the Vite/esbuild config-loading issue in this workspace while keeping the app reachable from one command.

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt

# Configure local .env
cp .env.example .env
# Edit DATABASE_URL to point to local PostgreSQL

# Run database migrations
alembic upgrade head

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit VITE_API_URL=http://localhost:8000

npm run dev
```

---

## System Workflow

```
1. Login as Admin
2. Upload Certificate Template (PNG/JPG/PDF)
3. Configure Placeholder Positions (click on template to set X,Y)
4. Create an Event
5. Upload Excel File with Attendee List
6. Preview First Certificate
7. Generate All Certificates (background processing)
8. Download ZIP or Send via Email
9. Attendees verify certificates via QR code or verification portal
```

---

## API Documentation

Interactive Swagger docs available at `http://localhost:8000/docs`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Admin login |
| GET | `/api/v1/dashboard/stats` | Dashboard statistics |
| POST | `/api/v1/templates/` | Upload template |
| POST | `/api/v1/events/` | Create event |
| POST | `/api/v1/events/{id}/upload-excel` | Import attendees |
| POST | `/api/v1/events/{id}/generate` | Bulk generate certificates |
| GET | `/api/v1/events/{id}/download-zip` | Download all PDFs |
| POST | `/api/v1/events/{id}/send-emails` | Send bulk emails |
| GET | `/api/v1/verify/{certificate_id}` | Public verification |

---

## Project Structure

```
I_CGS/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/v1/            # Route handlers
│   │   ├── core/              # Config, security, database
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # PDF, QR, ZIP, Email, Storage
│   ├── alembic/               # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React application
│   ├── src/
│   │   ├── api/               # Axios client + endpoints
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # Auth + Theme contexts
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Route pages
│   │   └── utils/             # Formatters, helpers
│   └── Dockerfile
├── nginx/                      # Nginx configuration
├── scripts/                    # DB init scripts
├── docker-compose.yml
└── .env.example
```

---

## Database Schema

| Table | Description |
|-------|-------------|
| `admins` | Admin user accounts |
| `templates` | Certificate templates with placeholder config |
| `events` | Training events/workshops |
| `certificates` | Generated certificates with metadata |
| `audit_logs` | System audit trail |

---

## Certificate Placeholder Config

The `placeholder_config` JSON field in templates supports:

```json
{
  "candidate_name": {
    "x": 595,
    "y": 420,
    "font_size": 36,
    "font_color": "#1a1a1a",
    "alignment": "center",
    "font_name": "Helvetica-Bold",
    "enabled": true
  },
  "certificate_id": { ... },
  "date": { ... },
  "course_name": { ... },
  "organization_name": {
    ...,
    "enabled": true
  },
  "organization_name_value": "Acme Training Co."
}
```

---

## Email Configuration (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password at: https://myaccount.google.com/apppasswords
3. Set in `.env`:
   ```
   EMAIL_ENABLED=True
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

---

## Production Deployment

```bash
# 1. Set strong secret key
openssl rand -hex 32  # Use this as SECRET_KEY

# 2. Update .env
SECRET_KEY=<generated-key>
ADMIN_PASSWORD=<strong-password>
FRONTEND_URL=https://your-domain.com
EMAIL_ENABLED=True

# 3. Deploy
docker-compose up -d --build

# 4. Run migrations
docker-compose exec backend alembic upgrade head
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 |
| PDF Generation | ReportLab + Pillow |
| Excel Processing | Pandas + OpenPyXL |
| QR Codes | qrcode[pil] |
| Email | aiosmtplib (async SMTP) |
| Auth | JWT (python-jose + bcrypt) |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |

---

## License

MIT License — Free for commercial and personal use.
