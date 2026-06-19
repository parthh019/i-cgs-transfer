from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class CertificateResponse(BaseModel):
    id: str
    certificate_id: str
    event_id: str
    attendee_name: str
    attendee_email: Optional[str]
    course_name: Optional[str]
    issue_date: date
    pdf_path: Optional[str]
    qr_code_path: Optional[str]
    status: str
    email_sent: bool
    email_sent_at: Optional[datetime]
    email_error: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class VerificationResponse(BaseModel):
    valid: bool
    certificate_id: str
    attendee_name: Optional[str] = None
    course_name: Optional[str] = None
    issue_date: Optional[date] = None
    event_name: Optional[str] = None
    status: str
    message: str


class CertificateFilter(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    event_id: Optional[str] = None
    email_sent: Optional[bool] = None
    page: int = 1
    page_size: int = 20
