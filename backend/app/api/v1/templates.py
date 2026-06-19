"""
Template routes:
  GET    /                     — list all templates
  POST   /                     — upload + create template (multipart)
  GET    /{template_id}        — get single template
  PUT    /{template_id}        — update name / placeholder_config
  DELETE /{template_id}        — delete template + file
  GET    /{template_id}/file   — stream the raw template file
"""

import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.audit import log_action
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.template import Template
from app.schemas.template import TemplateResponse, TemplateUpdate
from app.services.storage_service import storage_service

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "application/pdf"}
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def _extension_to_file_type(ext: str) -> str:
    return ext.lstrip(".").lower()


# ────────────────────────────────────────────────────────────────────────────
#  List templates
# ────────────────────────────────────────────────────────────────────────────


@router.get("/", summary="List all templates")
async def list_templates(
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(select(Template).order_by(Template.created_at.desc()))
    templates = result.scalars().all()
    items = [
        TemplateResponse(
            id=str(t.id),
            template_name=t.template_name,
            template_file=t.template_file,
            file_type=t.file_type,
            placeholder_config=t.placeholder_config,
            created_at=t.created_at,
        )
        for t in templates
    ]
    return {"items": items, "total": len(items)}


# ────────────────────────────────────────────────────────────────────────────
#  Create / upload template
# ────────────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and create a new template",
)
async def create_template(
    request: Request,
    template_name: str = Form(...),
    placeholder_config: str = Form(..., description="JSON string of PlaceholderConfig"),
    file: UploadFile = File(...),
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    # Validate file extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Read file and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 50 MB limit.",
        )

    # Parse placeholder config
    try:
        config_dict: dict = json.loads(placeholder_config)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid JSON in placeholder_config: {exc}",
        )

    file_type = _extension_to_file_type(suffix)
    unique_filename = f"{uuid.uuid4().hex}{suffix}"
    relative_path = storage_service.get_template_path(unique_filename)

    # Persist file
    await storage_service.save_file(relative_path, content)

    # Persist DB record
    template = Template(
        template_name=template_name,
        template_file=relative_path,
        file_type=file_type,
        placeholder_config=config_dict,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    await log_action(
        db,
        admin_id=current_admin.id,
        action="create",
        resource="template",
        resource_id=str(template.id),
        details={"template_name": template_name, "file_type": file_type},
        ip_address=request.client.host if request.client else None,
    )

    return TemplateResponse(
        id=str(template.id),
        template_name=template.template_name,
        template_file=template.template_file,
        file_type=template.file_type,
        placeholder_config=template.placeholder_config,
        created_at=template.created_at,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Get single template
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{template_id}", response_model=TemplateResponse, summary="Get a template by ID")
async def get_template(
    template_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    template = await _get_template_or_404(template_id, db)
    return TemplateResponse(
        id=str(template.id),
        template_name=template.template_name,
        template_file=template.template_file,
        file_type=template.file_type,
        placeholder_config=template.placeholder_config,
        created_at=template.created_at,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Update template
# ────────────────────────────────────────────────────────────────────────────


@router.put("/{template_id}", response_model=TemplateResponse, summary="Update a template")
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> TemplateResponse:
    template = await _get_template_or_404(template_id, db)

    if body.template_name is not None:
        template.template_name = body.template_name
    if body.placeholder_config is not None:
        template.placeholder_config = body.placeholder_config.model_dump(exclude_none=False)

    await db.commit()
    await db.refresh(template)

    await log_action(
        db,
        admin_id=current_admin.id,
        action="update",
        resource="template",
        resource_id=str(template.id),
        details=body.model_dump(exclude_none=True),
        ip_address=request.client.host if request.client else None,
    )

    return TemplateResponse(
        id=str(template.id),
        template_name=template.template_name,
        template_file=template.template_file,
        file_type=template.file_type,
        placeholder_config=template.placeholder_config,
        created_at=template.created_at,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Delete template
# ────────────────────────────────────────────────────────────────────────────


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a template",
)
async def delete_template(
    template_id: str,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    template = await _get_template_or_404(template_id, db)

    # Remove file from storage
    storage_service.delete_file(template.template_file)

    await log_action(
        db,
        admin_id=current_admin.id,
        action="delete",
        resource="template",
        resource_id=str(template.id),
        details={"template_name": template.template_name},
        ip_address=request.client.host if request.client else None,
    )

    await db.delete(template)
    await db.commit()


# ────────────────────────────────────────────────────────────────────────────
#  Stream template file
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{template_id}/file", summary="Download / stream the raw template file")
async def get_template_file(
    template_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    template = await _get_template_or_404(template_id, db)
    abs_path = storage_service.get_absolute_path(template.template_file)

    if not abs_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template file not found on disk.",
        )

    media_type_map = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "pdf": "application/pdf",
    }
    media_type = media_type_map.get(template.file_type, "application/octet-stream")

    return FileResponse(
        path=str(abs_path),
        media_type=media_type,
        filename=f"{template.template_name}{Path(template.template_file).suffix}",
    )


# ────────────────────────────────────────────────────────────────────────────
#  Helper
# ────────────────────────────────────────────────────────────────────────────


async def _get_template_or_404(template_id: str, db: AsyncSession) -> Template:
    try:
        uid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UUID format.")

    result = await db.execute(select(Template).where(Template.id == uid))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found.",
        )
    return template
