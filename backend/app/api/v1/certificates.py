"""
Certificate routes:
  GET    /                              — paginated list with filters
  GET    /{certificate_id}              — get by UUID
  GET    /by-cert-id/{cert_id}          — get by certificate_id string
  GET    /{certificate_id}/download     — stream PDF
  POST   /{certificate_id}/regenerate   — regenerate PDF
  DELETE /{certificate_id}              — delete certificate
  POST   /{certificate_id}/send-email   — send email for this certificate
"""

import io
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.audit import log_action
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.certificate import Certificate
from app.models.event import Event
from app.models.template import Template
from app.schemas.certificate import CertificateResponse
from app.services.email_service import email_service
from app.services.pdf_service import pdf_service
from app.services.storage_service import storage_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  List certificates
# ────────────────────────────────────────────────────────────────────────────


@router.get("/", summary="List certificates with filters and pagination")
async def list_certificates(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    event_id: Optional[str] = None,
    email_sent: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    query = select(Certificate)

    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                Certificate.attendee_name.ilike(term),
                Certificate.attendee_email.ilike(term),
                Certificate.certificate_id.ilike(term),
                Certificate.course_name.ilike(term),
            )
        )
    if status_filter:
        query = query.where(Certificate.status == status_filter)
    if event_id:
        try:
            ev_uid = uuid.UUID(event_id)
            query = query.where(Certificate.event_id == ev_uid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid event_id UUID.")
    if email_sent is not None:
        query = query.where(Certificate.email_sent == email_sent)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Page
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Certificate.created_at.desc()).offset(offset).limit(page_size)
    )
    certs = result.scalars().all()

    items = [_cert_to_response(c) for c in certs]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────────────────
#  Get by UUID
# ────────────────────────────────────────────────────────────────────────────


@router.get("/by-cert-id/{cert_id}", response_model=CertificateResponse,
            summary="Get certificate by certificate_id string")
async def get_by_cert_id(
    cert_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> CertificateResponse:
    result = await db.execute(
        select(Certificate).where(Certificate.certificate_id == cert_id)
    )
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail=f"Certificate '{cert_id}' not found.")
    return _cert_to_response(cert)


@router.get("/{certificate_id}", response_model=CertificateResponse,
            summary="Get certificate by UUID")
async def get_certificate(
    certificate_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> CertificateResponse:
    cert = await _get_cert_or_404(certificate_id, db)
    return _cert_to_response(cert)


# ────────────────────────────────────────────────────────────────────────────
#  Download PDF
# ────────────────────────────────────────────────────────────────────────────


@router.get("/{certificate_id}/download", summary="Download certificate PDF")
async def download_certificate(
    certificate_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    cert = await _get_cert_or_404(certificate_id, db)

    if not cert.pdf_path or not storage_service.file_exists(cert.pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not yet generated for this certificate.",
        )

    abs_path = storage_service.get_absolute_path(cert.pdf_path)
    safe_name = cert.certificate_id.replace("/", "_").replace("\\", "_")
    return FileResponse(
        path=str(abs_path),
        media_type="application/pdf",
        filename=f"{safe_name}.pdf",
    )


# ────────────────────────────────────────────────────────────────────────────
#  Regenerate
# ────────────────────────────────────────────────────────────────────────────


@router.post("/{certificate_id}/regenerate", response_model=CertificateResponse,
             summary="Regenerate PDF for a certificate")
async def regenerate_certificate(
    certificate_id: str,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> CertificateResponse:
    cert = await _get_cert_or_404(certificate_id, db)

    # Load event + template
    event_result = await db.execute(select(Event).where(Event.id == cert.event_id))
    event = event_result.scalar_one_or_none()
    if not event or not event.template_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event or template not found for this certificate.",
        )

    tmpl_result = await db.execute(select(Template).where(Template.id == event.template_id))
    template = tmpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found.",
        )

    certificate_data = {
        "candidate_name": cert.attendee_name,
        "certificate_id": cert.certificate_id,
        "date": cert.issue_date.strftime("%B %d, %Y"),
        "course_name": cert.course_name or "",
        "organization_name": template.placeholder_config.get("organization_name_value", ""),
    }

    try:
        pdf_path = pdf_service.generate_certificate(
            template_relative_path=template.template_file,
            file_type=template.file_type,
            placeholder_config=template.placeholder_config,
            certificate_data=certificate_data,
            event_id=str(event.id),
            certificate_id=cert.certificate_id,
            generate_qr=True,
        )
        cert.pdf_path = pdf_path
        cert.qr_code_path = f"qrcodes/{cert.certificate_id}.png"
        cert.status = "generated"
        await db.commit()
        await db.refresh(cert)
    except Exception as exc:
        logger.error("Regeneration failed for %s: %s", cert.certificate_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {exc}",
        )

    await log_action(
        db,
        admin_id=current_admin.id,
        action="regenerate",
        resource="certificate",
        resource_id=str(cert.id),
        details={"certificate_id": cert.certificate_id},
        ip_address=request.client.host if request.client else None,
    )

    return _cert_to_response(cert)


# ────────────────────────────────────────────────────────────────────────────
#  Delete certificate
# ────────────────────────────────────────────────────────────────────────────


@router.delete(
    "/{certificate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a certificate and its files",
)
async def delete_certificate(
    certificate_id: str,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    cert = await _get_cert_or_404(certificate_id, db)

    if cert.pdf_path:
        storage_service.delete_file(cert.pdf_path)
    if cert.qr_code_path:
        storage_service.delete_file(cert.qr_code_path)

    await log_action(
        db,
        admin_id=current_admin.id,
        action="delete",
        resource="certificate",
        resource_id=str(cert.id),
        details={"certificate_id": cert.certificate_id, "attendee_name": cert.attendee_name},
        ip_address=request.client.host if request.client else None,
    )

    await db.delete(cert)
    await db.commit()


# ────────────────────────────────────────────────────────────────────────────
#  Send email
# ────────────────────────────────────────────────────────────────────────────


@router.post("/{certificate_id}/send-email", summary="Send certificate email")
async def send_certificate_email(
    certificate_id: str,
    request: Request,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    cert = await _get_cert_or_404(certificate_id, db)

    if not cert.attendee_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This certificate has no email address on record.",
        )
    if not cert.pdf_path or not storage_service.file_exists(cert.pdf_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate PDF has not been generated yet.",
        )

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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {exc}",
        )


# ────────────────────────────────────────────────────────────────────────────
#  Helpers
# ────────────────────────────────────────────────────────────────────────────


async def _get_cert_or_404(certificate_id: str, db: AsyncSession) -> Certificate:
    try:
        uid = uuid.UUID(certificate_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format.")

    result = await db.execute(select(Certificate).where(Certificate.id == uid))
    cert = result.scalar_one_or_none()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate '{certificate_id}' not found.",
        )
    return cert


def _cert_to_response(cert: Certificate) -> CertificateResponse:
    return CertificateResponse(
        id=str(cert.id),
        certificate_id=cert.certificate_id,
        event_id=str(cert.event_id),
        attendee_name=cert.attendee_name,
        attendee_email=cert.attendee_email,
        course_name=cert.course_name,
        issue_date=cert.issue_date,
        pdf_path=cert.pdf_path,
        qr_code_path=cert.qr_code_path,
        status=cert.status,
        email_sent=cert.email_sent,
        email_sent_at=cert.email_sent_at,
        email_error=cert.email_error,
        created_at=cert.created_at,
    )
