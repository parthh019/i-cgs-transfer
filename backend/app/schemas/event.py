from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class EventCreate(BaseModel):
    event_name: str
    event_date: date
    template_id: Optional[str] = None


class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    event_date: Optional[date] = None
    template_id: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    event_name: str
    event_date: date
    template_id: Optional[str]
    status: str
    total_certificates: int
    generated_certificates: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ExcelPreview(BaseModel):
    total_records: int
    valid_records: int
    invalid_records: int
    columns_found: List[str]
    preview_rows: List[Dict[str, Any]]  # first 5 rows
    errors: List[str]
