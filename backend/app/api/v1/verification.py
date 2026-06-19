"""
Public verification routes — NO auth required:
  GET /{certificate_id}  — verify a certificate by its certificate_id string
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.certificate import Certificate
from app.models.event import Event
from app.schemas.certificate import VerificationResponse

router = APIRouter()


@router.get(
    "/{certificate_id}",
    response_model=VerificationResponse,
    summary="Public certificate verification",
)
async def verify_certificate(
    certificate_id: str,
    db: AsyncSession = Depends(get_db),
) -> VerificationResponse:
    """
    Publicly verify a certificate by its human-readable certificate_id.
    Returns valid=True if the certificate exists and has been generated or emailed.
    No authentication required — designed to be called from QR-code scans.
    """
    result = await db.execute(
        select(Certificate).where(Certificate.certificate_id == certificate_id)
    )
    cert = result.scalar_one_or_none()

    if not cert:
        return VerificationResponse(
            valid=False,
            certificate_id=certificate_id,
            attendee_name=None,
            course_name=None,
            issue_date=None,
            event_name=None,
            status="not_found",
            message="Certificate not found. Please check the certificate ID and try again.",
        )

    # Load associated event for event_name
    event_result = await db.execute(select(Event).where(Event.id == cert.event_id))
    event = event_result.scalar_one_or_none()
    event_name = event.event_name if event else None

    valid = cert.status in ("generated", "emailed")

    if valid:
        message = (
            f"This certificate was issued to {cert.attendee_name} "
            f"for {cert.course_name or 'a training program'} "
            f"on {cert.issue_date.strftime('%B %d, %Y')}."
        )
    elif cert.status == "pending":
        message = "Certificate is pending generation. Please try again later."
    elif cert.status == "failed":
        message = "Certificate generation failed. Please contact the issuing organization."
    else:
        message = f"Certificate status: {cert.status}."

    return VerificationResponse(
        valid=valid,
        certificate_id=cert.certificate_id,
        attendee_name=cert.attendee_name if valid else None,
        course_name=cert.course_name if valid else None,
        issue_date=cert.issue_date if valid else None,
        event_name=event_name if valid else None,
        status=cert.status,
        message=message,
    )
