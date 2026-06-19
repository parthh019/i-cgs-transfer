"""
Certificate Management System — FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth as auth_router_module
from app.api.v1 import (
    certificates,
    dashboard,
    email_router,
    events,
    excel,
    templates,
    verification,
)
from app.core.config import settings
from app.core.database import AsyncSessionLocal, create_tables

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  Lifespan
# ────────────────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("Starting Certificate Management System API …")

    # Ensure storage directories exist
    for subdir in ("certificates", "qrcodes", "templates"):
        Path(settings.STORAGE_BASE_PATH, subdir).mkdir(parents=True, exist_ok=True)
    logger.info("Storage directories verified.")

    # Create DB tables (development convenience — use Alembic in production)
    try:
        await create_tables()
        logger.info("Database tables ensured.")
    except Exception as exc:
        logger.error("Could not create DB tables: %s", exc)

    # Seed default admin if none exists
    try:
        async with AsyncSessionLocal() as db:
            await auth_router_module.create_default_admin(db)
    except Exception as exc:
        logger.error("Admin seeding failed: %s", exc)

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("Certificate Management System API shutting down.")


# ────────────────────────────────────────────────────────────────────────────
#  Application
# ────────────────────────────────────────────────────────────────────────────


app = FastAPI(
    title="Certificate Management System API",
    version="1.0.0",
    description="Production-ready API for certificate generation and management",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production via settings
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ─────────────────────────────────────────────────────────────
storage_path = Path(settings.STORAGE_BASE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")

# ────────────────────────────────────────────────────────────────────────────
#  Routers
# ────────────────────────────────────────────────────────────────────────────

API_V1 = "/api/v1"

app.include_router(
    auth_router_module.router,
    prefix=f"{API_V1}/auth",
    tags=["Authentication"],
)
app.include_router(
    templates.router,
    prefix=f"{API_V1}/templates",
    tags=["Templates"],
)
app.include_router(
    events.router,
    prefix=f"{API_V1}/events",
    tags=["Events"],
)
app.include_router(
    certificates.router,
    prefix=f"{API_V1}/certificates",
    tags=["Certificates"],
)
app.include_router(
    excel.router,
    prefix=API_V1,
    tags=["Excel"],
)
app.include_router(
    email_router.router,
    prefix=f"{API_V1}/email",
    tags=["Email"],
)
app.include_router(
    verification.router,
    prefix=f"{API_V1}/verify",
    tags=["Verification"],
)
app.include_router(
    dashboard.router,
    prefix=f"{API_V1}/dashboard",
    tags=["Dashboard"],
)


# ────────────────────────────────────────────────────────────────────────────
#  Health check
# ────────────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["Health"], summary="Health check")
async def health_check():
    """Simple liveness probe."""
    return {"status": "healthy", "version": "1.0.0"}
