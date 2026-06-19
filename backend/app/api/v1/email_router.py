"""
Email routes (named email_router.py to avoid collision with stdlib email module):
  POST /events/{event_id}/send-all         — bulk email all generated certs
  GET  /events/{event_id}/status           — email delivery stats
  POST /certificates/{cert_uuid}/send      — send single certificate email
  POST /certificates/{cert_uuid}/retry     — retry a failed email
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.certificate import Certificate
from app.models.event import Event
from app.services.email_service import email_service
from app.services.storage_service import storage_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  Bulk send
# ────────────────────────────────────────────────────────────────────────────


async def _bulk_send_task(event_id: str) -> None:
    """Background task: send emails for all eligible certs in an event."""
    from app.core.database import AsyncSessionLocal

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
                    logger.error("Email failed for %s: %s", cert.certificate_id, exc)

            await db.commit()
        except Exception as exc:
            logger.error("Bulk send task failed for event %s: %s", event_id, exc)


@router.post("/events/{event_id}/send-all", summary="Bulk-send emails for all generated certs")
async def send_all_emails(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    event = await _get_event_or_404(event_id, db)
    background_tasks.add_task(_bulk_send_task, str(event.id))
    return {"message": "Bulk email job queued.", "event_id": str(event.id)}


# ────────────────────────────────────────────────────────────────────────────
#  Email status
# ────────────────────────────────────────────────────────────────────────────


@router.get("/events/{event_id}/status", summary="Email delivery stats for an event")
async def get_email_status(
    event_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    event = await _get_event_or_404(event_id, db)

    async def count(where_clauses) -> int:
        q = select(func.count()).select_from(Certificate)
        for clause in where_clauses:
            q = q.where(clause)
        res = await db.execute(q)
        return res.scalar_one()

    total = await count([Certificate.event_id == event.id])
    sent = await count([Certificate.event_id == event.id, Certificate.email_sent == True])  # noqa: E712
    failed = await count([Certificate.event_id == event.id, Certificate.email_error.isnot(None)])
    no_email = await count([Certificate.event_id == event.id, Certificate.attendee_email.is_(None)])

    return {
        "event_id": str(event.id),
        "total": total,
        "sent": sent,
        "failed": failed,
        "no_email": no_email,
        "pending": max(0, total - sent - failed - no_email),
    }


# ────────────────────────────────────────────────────────────────────────────
#  Single send
# ────────────────────────────────────────────────────────────────────────────


@router.post("/certificates/{cert_uuid}/send", summary="Send email for a single certificate")
async def send_single_email(
    cert_uuid: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    cert = await _get_cert_or_404(cert_uuid, db)

    if not cert.attendee_email:
        raise HTTPException(status_code=400, detail="No email address for this certificate.")
    if not cert.pdf_path or not storage_service.file_exists(cert.pdf_path):
        raise HTTPException(status_code=400, detail="PDF not yet generated.")

    try:
        sent = await email_service.send_certificate_email(
            to_email=cert.attendee_email,
            attendee_name=cert.attendee_name,
            course_name=cert.course_name or "",
            certificate_id=cert.certificate_id,
            pdf_path=cert.pdf_path,
        )
        if sent:
            cert.email_sent = True
            cert.email_sent_at = datetime.utcnow()
            cert.status = "emailed"
            cert.email_error = None
            await db.commit()
            return {"message": f"Email sent to {cert.attendee_email}.", "status": "sent"}
        else:
            return {"message": "Email sending is disabled.", "status": "disabled"}
    except Exception as exc:
        cert.email_error = str(exc)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Email send failed: {exc}")


# ────────────────────────────────────────────────────────────────────────────
#  Retry failed
# ────────────────────────────────────────────────────────────────────────────


@router.post("/certificates/{cert_uuid}/retry", summary="Retry a failed email")
async def retry_email(
    cert_uuid: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    cert = await _get_cert_or_404(cert_uuid, db)

    if not cert.email_error and cert.email_sent:
        raise HTTPException(status_code=400, detail="Email already sent successfully.")
    if not cert.attendee_email:
        raise HTTPException(status_code=400, detail="No email address for this certificate.")
    if not cert.pdf_path or not storage_service.file_exists(cert.pdf_path):
        raise HTTPException(status_code=400, detail="PDF not yet generated.")

    # Clear the previous error and retry
    cert.email_error = None
    await db.commit()

    try:
        sent = await email_service.send_certificate_email(
            to_email=cert.attendee_email,
            attendee_name=cert.attendee_name,
            course_name=cert.course_name or "",
            certificate_id=cert.certificate_id,
            pdf_path=cert.pdf_path,
        )
        if sent:
            cert.email_sent = True
            cert.email_sent_at = datetime.utcnow()
            cert.status = "emailed"
            cert.email_error = None
            await db.commit()
            return {"message": f"Retry successful — email sent to {cert.attendee_email}.", "status": "sent"}
        else:
            return {"message": "Email sending is disabled.", "status": "disabled"}
    except Exception as exc:
        cert.email_error = str(exc)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Retry failed: {exc}")


@router.post("/send-custom", summary="Send a custom email with PDF attachment via SMTP")
async def send_custom_email_endpoint(
    to_email: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    pdf_file: UploadFile = File(...),
    current_admin: Admin = Depends(get_current_admin),
) -> Dict[str, str]:
    if not settings.EMAIL_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email service is disabled on the backend (EMAIL_ENABLED=False)."
        )

    try:
        pdf_bytes = await pdf_file.read()
        success = await email_service.send_custom_email(
            to_email=to_email,
            subject=subject,
            body_text=body,
            pdf_bytes=pdf_bytes,
            pdf_filename=pdf_file.filename or "Certificate.pdf"
        )
        if success:
            return {"status": "success", "message": f"Email sent successfully to {to_email}."}
        else:
            return {"status": "disabled", "message": "Email sending is disabled."}
    except Exception as exc:
        logger.error("Failed to send custom email to %s: %s", to_email, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc)
        )


@router.get("/config", summary="Get SMTP configuration (excluding passwords)")
async def get_email_config(
    current_admin: Admin = Depends(get_current_admin),
) -> Dict[str, Any]:
    return {
        "email_enabled": settings.EMAIL_ENABLED,
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_user": settings.SMTP_USER,
        "email_from_name": settings.EMAIL_FROM_NAME,
    }


# ────────────────────────────────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────────────────────────────────


async def _get_event_or_404(event_id: str, db: AsyncSession) -> Event:
    try:
        uid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID.")
    result = await db.execute(select(Event).where(Event.id == uid))
    ev = result.scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")
    return ev


async def _get_cert_or_404(cert_uuid: str, db: AsyncSession) -> Certificate:
    try:
        uid = uuid.UUID(cert_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID.")
    result = await db.execute(select(Certificate).where(Certificate.id == uid))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail=f"Certificate '{cert_uuid}' not found.")
    return cert
