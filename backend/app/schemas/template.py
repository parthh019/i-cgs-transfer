from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PlaceholderField(BaseModel):
    x: float
    y: float
    font_size: int = 24
    font_color: str = "#000000"
    alignment: str = "center"  # left / center / right
    font_name: str = "Helvetica-Bold"
    enabled: bool = True


class PlaceholderConfig(BaseModel):
    candidate_name: Optional[PlaceholderField] = None
    certificate_id: Optional[PlaceholderField] = None
    date: Optional[PlaceholderField] = None
    course_name: Optional[PlaceholderField] = None
    organization_name: Optional[PlaceholderField] = None
    organization_name_value: Optional[str] = None  # static text override


class TemplateCreate(BaseModel):
    template_name: str
    placeholder_config: PlaceholderConfig


class TemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    placeholder_config: Optional[PlaceholderConfig] = None


class TemplateResponse(BaseModel):
    id: str
    template_name: str
    template_file: str
    file_type: str
    placeholder_config: dict
    created_at: datetime

    model_config = {"from_attributes": True}
