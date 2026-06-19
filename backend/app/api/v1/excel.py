"""
Excel / generation routes:
  POST /events/{event_id}/upload-excel   — parse Excel, insert pending certs
  POST /events/{event_id}/generate       — background PDF generation
  GET  /events/{event_id}/preview        — preview PNG of first pending cert
"""

import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.certificate import Certificate
from app.models.event import Event
from app.models.template import Template
from app.schemas.event import ExcelPreview
from app.services.excel_service import excel_service
from app.services.pdf_service import pdf_service

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXCEL_EXTENSIONS = {".xlsx", ".xls"}
MAX_EXCEL_SIZE = 20 * 1024 * 1024  # 20 MB


# ────────────────────────────────────────────────────────────────────────────
#  Upload Excel
# ────────────────────────────────────────────────────────────────────────────


@router.post(
    "/events/{event_id}/upload-excel",
    response_model=ExcelPreview,
    summary="Upload Excel with attendee data — creates pending certificates",
)
async def upload_excel(
    event_id: str,
    file: UploadFile = File(...),
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> ExcelPreview:
    # Validate event
    event = await _get_event_or_404(event_id, db)

    # Validate file
    from pathlib import Path

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXCEL_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{suffix}'. Upload .xlsx or .xls files only.",
        )

    content = await file.read()
    if len(content) > MAX_EXCEL_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Excel file exceeds the 20 MB limit.",
        )

    # Parse
    records, columns_found, errors = excel_service.parse_excel(
        content,
        event_name=event.event_name,
        event_date=event.event_date,
    )

    valid_records = len(records)
    invalid_records = sum(1 for e in errors if "Row" in e)  # rough count

    # Check for duplicate certificate IDs in this event
    existing_cert_ids_result = await db.execute(
        select(Certificate.certificate_id).where(Certificate.event_id == event.id)
    )
    existing_cert_ids = {r for (r,) in existing_cert_ids_result.all()}

    inserted = 0
    for rec in records:
        # Skip duplicates
        if rec["certificate_id"] in existing_cert_ids:
            errors.append(
                f"Certificate ID '{rec['certificate_id']}' already exists for this event — skipped."
            )
            valid_records -= 1
            invalid_records += 1
            continue

        cert = Certificate(
            certificate_id=rec["certificate_id"],
            event_id=event.id,
            attendee_name=rec["attendee_name"],
            attendee_email=rec.get("attendee_email"),
            course_name=rec.get("course_name"),
            issue_date=rec["issue_date"],
            status="pending",
            email_sent=False,
        )
        db.add(cert)
        existing_cert_ids.add(rec["certificate_id"])
        inserted += 1

    # Update event totals
    event.total_certificates = (event.total_certificates or 0) + inserted
    await db.commit()

    # Build preview rows (first 5)
    preview_rows = []
    for rec in records[:5]:
        preview_rows.append(
            {
                "attendee_name": rec["attendee_name"],
                "attendee_email": rec.get("attendee_email"),
                "certificate_id": rec["certificate_id"],
                "course_name": rec.get("course_name"),
                "issue_date": str(rec["issue_date"]),
            }
        )

    return ExcelPreview(
        total_records=len(records) + invalid_records,
        valid_records=valid_records,
        invalid_records=invalid_records,
        columns_found=columns_found,
        preview_rows=preview_rows,
        errors=errors,
    )


# ────────────────────────────────────────────────────────────────────────────
#  Trigger generation
# ────────────────────────────────────────────────────────────────────────────


async def _generate_certificates_task(event_id: str) -> None:
    """
    Background task: generate PDFs for all pending certificates in the event.
    Updates progress counters on the Event row as each certificate is done.
    """
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            event_result = await db.execute(
                select(Event).where(Event.id == uuid.UUID(event_id))
            )
            event = event_result.scalar_one_or_none()
            if not event:
                logger.error("Generation task: event %s not found.", event_id)
                return

            # Load template
            template: Template | None = None
            if event.template_id:
                tmpl_result = await db.execute(
                    select(Template).where(Template.id == event.template_id)
                )
                template = tmpl_result.scalar_one_or_none()

            if not template:
                logger.error(
                    "Generation task: event %s has no associated template.", event_id
                )
                event.status = "failed"
                await db.commit()
                return

            # Mark event as processing
            event.status = "processing"
            await db.commit()

            # Fetch all pending certificates
            cert_result = await db.execute(
                select(Certificate).where(
                    Certificate.event_id == event.id,
                    Certificate.status == "pending",
                )
            )
            certs = cert_result.scalars().all()

            for cert in certs:
                try:
                    certificate_data = {
                        "candidate_name": cert.attendee_name,
                        "certificate_id": cert.certificate_id,
                        "date": cert.issue_date.strftime("%B %d, %Y"),
                        "course_name": cert.course_name or "",
                        "organization_name": template.placeholder_config.get(
                            "organization_name_value", ""
                        ),
                    }

                    pdf_path = pdf_service.generate_certificate(
                        template_relative_path=template.template_file,
                        file_type=template.file_type,
                        placeholder_config=template.placeholder_config,
                        certificate_data=certificate_data,
                        event_id=str(event.id),
                        certificate_id=cert.certificate_id,
                        generate_qr=True,
                    )

                    qr_path_str = f"qrcodes/{cert.certificate_id}.png"

                    cert.pdf_path = pdf_path
                    cert.qr_code_path = qr_path_str
                    cert.status = "generated"

                    event.generated_certificates = (event.generated_certificates or 0) + 1

                    await db.commit()

                except Exception as exc:
                    logger.error(
                        "Failed to generate certificate %s: %s",
                        cert.certificate_id,
                        exc,
                        exc_info=True,
                    )
                    cert.status = "failed"
                    await db.commit()

            # Final event status
            failed_result = await db.execute(
                select(func.count()).select_from(Certificate).where(
                    Certificate.event_id == event.id,
                    Certificate.status == "failed",
                )
            )
            failed_count = failed_result.scalar_one()

            if failed_count == 0:
                event.status = "completed"
            elif event.generated_certificates == 0:
                event.status = "failed"
            else:
                event.status = "completed"  # partial success treated as completed

            await db.commit()
            logger.info(
                "Generation complete for event %s: %d generated, %d failed.",
                event_id,
                event.generated_certificates,
                failed_count,
            )

        except Exception as exc:
            logger.error("Generation task crashed for event %s: %s", event_id, exc, exc_info=True)
            try:
                event_result2 = await db.execute(
                    select(Event).where(Event.id == uuid.UUID(event_id))
                )
                ev = event_result2.scalar_one_or_none()
                if ev:
                    ev.status = "failed"
                    await db.commit()
            except Exception:
                pass


@router.post(
    "/events/{event_id}/generate",
    summary="Trigger background PDF generation for all pending certificates",
)
async def generate_certificates(
    event_id: str,
    background_tasks: BackgroundTasks,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    event = await _get_event_or_404(event_id, db)

    if event.status == "processing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generation is already in progress for this event.",
        )

    # Check pending count
    count_result = await db.execute(
        select(func.count()).select_from(Certificate).where(
            Certificate.event_id == event.id,
            Certificate.status == "pending",
        )
    )
    pending_count = count_result.scalar_one()
    if pending_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending certificates found. Upload Excel data first.",
        )

    background_tasks.add_task(_generate_certificates_task, str(event.id))

    return {
        "message": f"Certificate generation started for {pending_count} certificates.",
        "event_id": str(event.id),
    }


# ────────────────────────────────────────────────────────────────────────────
#  Preview
# ────────────────────────────────────────────────────────────────────────────


@router.get(
    "/events/{event_id}/preview",
    summary="Preview certificate as PNG image",
    response_class=Response,
)
async def preview_certificate(
    event_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    event = await _get_event_or_404(event_id, db)

    if not event.template_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event has no template assigned.",
        )

    tmpl_result = await db.execute(
        select(Template).where(Template.id == event.template_id)
    )
    template = tmpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found.",
        )

    # Get first certificate (pending or generated) for sample data
    cert_result = await db.execute(
        select(Certificate)
        .where(Certificate.event_id == event.id)
        .limit(1)
    )
    cert = cert_result.scalar_one_or_none()

    if cert:
        sample_data = {
            "candidate_name": cert.attendee_name,
            "certificate_id": cert.certificate_id,
            "date": cert.issue_date.strftime("%B %d, %Y"),
            "course_name": cert.course_name or event.event_name,
            "organization_name": template.placeholder_config.get(
                "organization_name_value", "Organization"
            ),
        }
    else:
        sample_data = {
            "candidate_name": "John Doe",
            "certificate_id": "CERT-PREVIEW-001",
            "date": event.event_date.strftime("%B %d, %Y"),
            "course_name": event.event_name,
            "organization_name": template.placeholder_config.get(
                "organization_name_value", "Organization"
            ),
        }

    preview_bytes = pdf_service.generate_preview(
        template_relative_path=template.template_file,
        file_type=template.file_type,
        placeholder_config=template.placeholder_config,
        sample_data=sample_data,
    )

    # If bytes start with PDF header, return as PDF; otherwise PNG
    if preview_bytes[:4] == b"%PDF":
        return Response(content=preview_bytes, media_type="application/pdf")
    return Response(content=preview_bytes, media_type="image/png")


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
