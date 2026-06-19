"""
Event routes:
  GET    /                           — paginated list of events
  POST   /                           — create event
  GET    /{event_id}                 — get event details
  PUT    /{event_id}                 — update event
  DELETE /{event_id}                 — delete event + all certificates + files
  GET    /{event_id}/status          — generation progress
  GET    /{event_id}/download-zip    — stream ZIP of generated PDFs
  POST   /{event_id}/send-emails     — trigger bulk email (background)
  GET    /{event_id}/email-status    — email delivery stats
"""

import io
import logging
import uuid
from typing import Any, Dict

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.audit import log_action
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.certificate import Certificate
from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.services.email_service import email_service
from app.services.storage_service import storage_service
from app.services.zip_service import zip_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  List events
# ────────────────────────────────────────────────────────────────────────────


@router.get("/", summary="List all events with pagination")
async def list_events(
    page: int = 1,
    page_size: int = 20,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    offset = (page - 1) * page_size

    count_result = await db.execute(select(func.count()).select_from(Event))
    total = count_result.scalar_one()

    result = await db.execute(
        select(Event).order_by(Event.created_at.desc()).offset(offset).limit(page_size)
    )
    events = result.scalars().all()

    items = [
        EventResponse(
            id=str(e.id),
            event_name=e.event_name,
            event_date=e.event_date,
            template_id=str(e.template_id) if e.template_id else None,
            status=e.status,
            total_certificates=e.total_certificates,
            generated_certificates=e.generated_certificates,
            created_at=e.created_at,
        )
        for e in events
    ]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────────────────
#  Create event
# ────────────────────────────────────────────────────────────────────────────


@router.post(
    "/",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new event",
)
async def create_event(
    body: EventCreate,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    template_id = uuid.UUID(body.template_id) if body.template_id else None

    event = Event(
        event_name=body.event_name,
        event_date=body.event_date,
        template_id=template_id,
        status="draft",
        total_certificates=0,
        generated_certificates=0,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    await log_action(
        db,
        admin_id=current_admin.id,
        action="create",
        resource="event",
        resource_id=str(event.id),
        details={"event_name": body.event_name},
        ip_address=request.client.host if request.client else None,
    )

    return EventResponse(
        id=str(event.id),
        event_name=event.event_name,
        event_date=event.event_date,
        template_id=str(event.template_id) if event.template_id else None,
        status=event.status,
        total_certificates=event.total_certificates,
        generated_certificates=event.generated_certificates,
        created_at=event.created_at,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Get event
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{event_id}", response_model=EventResponse, summary="Get event details")
async def get_event(
    event_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    event = await _get_event_or_404(event_id, db)
    return EventResponse(
        id=str(event.id),
        event_name=event.event_name,
        event_date=event.event_date,
        template_id=str(event.template_id) if event.template_id else None,
        status=event.status,
        total_certificates=event.total_certificates,
        generated_certificates=event.generated_certificates,
        created_at=event.created_at,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Update event
# ────────────────────────────────────────────────────────────────────────────


@router.put("/{event_id}", response_model=EventResponse, summary="Update an event")
async def update_event(
    event_id: str,
    body: EventUpdate,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> EventResponse:
    event = await _get_event_or_404(event_id, db)

    if body.event_name is not None:
        event.event_name = body.event_name
    if body.event_date is not None:
        event.event_date = body.event_date
    if body.template_id is not None:
        event.template_id = uuid.UUID(body.template_id)

    await db.commit()
    await db.refresh(event)

    await log_action(
        db,
        admin_id=current_admin.id,
        action="update",
        resource="event",
        resource_id=str(event.id),
        details=body.model_dump(exclude_none=True),
        ip_address=request.client.host if request.client else None,
    )

    return EventResponse(
        id=str(event.id),
        event_name=event.event_name,
        event_date=event.event_date,
        template_id=str(event.template_id) if event.template_id else None,
        status=event.status,
        total_certificates=event.total_certificates,
        generated_certificates=event.generated_certificates,
        created_at=event.created_at,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Delete event
# ────────────────────────────────────────────────────────────────────────────


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an event and all its certificates",
)
async def delete_event(
    event_id: str,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    event = await _get_event_or_404(event_id, db)

    # Delete certificate files from storage
    result = await db.execute(
        select(Certificate).where(Certificate.event_id == event.id)
    )
    certs = result.scalars().all()
    for cert in certs:
        if cert.pdf_path:
            storage_service.delete_file(cert.pdf_path)
        if cert.qr_code_path:
            storage_service.delete_file(cert.qr_code_path)

    # Delete the event directory bucket
    storage_service.delete_directory(f"certificates/{event_id}")

    await log_action(
        db,
        admin_id=current_admin.id,
        action="delete",
        resource="event",
        resource_id=str(event.id),
        details={"event_name": event.event_name},
        ip_address=request.client.host if request.client else None,
    )

    await db.delete(event)
    await db.commit()


# ────────────────────────────────────────────────────────────────────────────
#  Status / progress
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{event_id}/status", summary="Get event generation progress")
async def get_event_status(
    event_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    event = await _get_event_or_404(event_id, db)
    total = event.total_certificates
    generated = event.generated_certificates
    percent = round((generated / total * 100) if total > 0 else 0, 1)
    return {
        "status": event.status,
        "total": total,
        "generated": generated,
        "percent": percent,
    }


# ────────────────────────────────────────────────────────────────────────────
#  ZIP download
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{event_id}/download-zip", summary="Download all generated certificates as ZIP")
async def download_event_zip(
    event_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    event = await _get_event_or_404(event_id, db)

    result = await db.execute(
        select(Certificate).where(
            Certificate.event_id == event.id,
            Certificate.status == "generated",
            Certificate.pdf_path.isnot(None),
        )
    )
    certs = result.scalars().all()

    if not certs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No generated certificates found for this event.",
        )

    pdf_paths = [c.pdf_path for c in certs if c.pdf_path]
    zip_bytes = zip_service.create_event_zip(event_id, pdf_paths)

    safe_name = event.event_name.replace(" ", "_")
    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_certificates.zip"'},
    )


# ────────────────────────────────────────────────────────────────────────────
#  Bulk email send
# ────────────────────────────────────────────────────────────────────────────


async def _send_event_emails_task(event_id: str) -> None:
    """Background task: send emails for all generated + un-emailed certificates."""
    from datetime import datetime

    from app.core.database import AsyncSessionLocal
    from app.models.certificate import Certificate

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Certificate).where(
                    Certificate.event_id == uuid.UUID(event_id),
                    Certificate.email_sent == False,  # noqa: E712
                    Certificate.attendee_email.isnot(None),
                    Certificate.status.in_(["generated", "emailed"]),
                )
            )
            certs = result.scalars().all()

            for cert in certs:
                try:
                    sent = await email_service.send_certificate_email(
                        to_email=cert.attendee_email,
                        attendee_name=cert.attendee_name,
                        course_name=cert.course_name or "",
                        certificate_id=cert.certificate_id,
                        pdf_path=cert.pdf_path or "",
                    )
                    if sent:
                        cert.email_sent = True
                        cert.email_sent_at = datetime.utcnow()
                        cert.status = "emailed"
                        cert.email_error = None
                except Exception as exc:
                    cert.email_error = str(exc)
                    logger.error("Email failed for cert %s: %s", cert.certificate_id, exc)

            await db.commit()
        except Exception as exc:
            logger.error("Bulk email task failed for event %s: %s", event_id, exc)


@router.post("/{event_id}/send-emails", summary="Trigger bulk email send for event")
async def send_event_emails(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    event = await _get_event_or_404(event_id, db)
    background_tasks.add_task(_send_event_emails_task, str(event.id))
    return {"message": "Bulk email job queued.", "event_id": str(event.id)}


# ────────────────────────────────────────────────────────────────────────────
#  Email stats
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{event_id}/email-status", summary="Get email delivery stats for event")
async def get_email_status(
    event_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    event = await _get_event_or_404(event_id, db)

    total_result = await db.execute(
        select(func.count()).select_from(Certificate).where(
            Certificate.event_id == event.id
        )
    )
    total = total_result.scalar_one()

    sent_result = await db.execute(
        select(func.count()).select_from(Certificate).where(
            Certificate.event_id == event.id,
            Certificate.email_sent == True,  # noqa: E712
        )
    )
    sent = sent_result.scalar_one()

    failed_result = await db.execute(
        select(func.count()).select_from(Certificate).where(
            Certificate.event_id == event.id,
            Certificate.email_error.isnot(None),
        )
    )
    failed = failed_result.scalar_one()

    no_email_result = await db.execute(
        select(func.count()).select_from(Certificate).where(
            Certificate.event_id == event.id,
            Certificate.attendee_email.is_(None),
        )
    )
    no_email = no_email_result.scalar_one()

    return {
        "total": total,
        "sent": sent,
        "failed": failed,
        "no_email": no_email,
        "pending": total - sent - failed - no_email,
    }


# ────────────────────────────────────────────────────────────────────────────
#  Helper
# ────────────────────────────────────────────────────────────────────────────


async def _get_event_or_404(event_id: str, db: AsyncSession) -> Event:
    try:
        uid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UUID.")

    result = await db.execute(select(Event).where(Event.id == uid))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event '{event_id}' not found.",
        )
    return event
