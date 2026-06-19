"""
Authentication routes:
  POST /login   — email + password → JWT
  GET  /me      — current admin info
  POST /register — create a new admin (requires existing auth)
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_admin,
    hash_password,
    verify_password,
)
from app.models.admin import Admin
from app.schemas.auth import AdminCreate, AdminInfo, AdminLogin, TokenResponse

router = APIRouter()
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  Startup helper — seed default admin
# ────────────────────────────────────────────────────────────────────────────


async def create_default_admin(db: AsyncSession) -> None:
    """
    Called from the application lifespan event.
    Creates the initial admin account if no admin exists yet.
    """
    result = await db.execute(select(Admin).limit(1))
    existing = result.scalar_one_or_none()
    if existing:
        return  # already seeded

    admin = Admin(
        name=settings.ADMIN_NAME,
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        is_active=True,
    )
    db.add(admin)
    await db.commit()
    logger.info("Default admin created: %s", settings.ADMIN_EMAIL)


# ────────────────────────────────────────────────────────────────────────────
#  Routes
# ────────────────────────────────────────────────────────────────────────────


@router.post("/login", response_model=TokenResponse, summary="Admin login")
async def login(
    body: AdminLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate with email + password and receive a JWT access token."""
    result = await db.execute(select(Admin).where(Admin.email == body.email))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled",
        )

    access_token = create_access_token(
        data={"sub": str(admin.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        admin=AdminInfo(
            id=str(admin.id),
            name=admin.name,
            email=admin.email,
            is_active=admin.is_active,
        ),
    )


@router.post(
    "/login/form",
    response_model=TokenResponse,
    summary="Admin login (OAuth2 form — for Swagger UI)",
    include_in_schema=True,
)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """OAuth2-compatible form login endpoint (used by Swagger UI Authorize)."""
    result = await db.execute(select(Admin).where(Admin.email == form_data.username))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(form_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    access_token = create_access_token(data={"sub": str(admin.id)})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        admin=AdminInfo(
            id=str(admin.id),
            name=admin.name,
            email=admin.email,
            is_active=admin.is_active,
        ),
    )


@router.get("/me", response_model=AdminInfo, summary="Get current admin info")
async def get_me(
    current_admin: Admin = Depends(get_current_admin),
) -> AdminInfo:
    """Return the profile of the currently authenticated admin."""
    return AdminInfo(
        id=str(current_admin.id),
        name=current_admin.name,
        email=current_admin.email,
        is_active=current_admin.is_active,
    )


@router.post(
    "/register",
    response_model=AdminInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new admin (requires auth)",
)
async def register_admin(
    body: AdminCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminInfo:
    """Create a new admin account. Only existing admins can call this."""
    # Check uniqueness
    result = await db.execute(select(Admin).where(Admin.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An admin with email '{body.email}' already exists.",
        )

    new_admin = Admin(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        is_active=True,
    )
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)

    return AdminInfo(
        id=str(new_admin.id),
        name=new_admin.name,
        email=new_admin.email,
        is_active=new_admin.is_active,
    )
