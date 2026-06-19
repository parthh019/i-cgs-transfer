import uuid

from sqlalchemy import Column, DateTime, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_name = Column(String(255), nullable=False)
    template_file = Column(String(500), nullable=False)  # relative storage path
    file_type = Column(String(10), nullable=False)  # png / jpg / jpeg / pdf
    placeholder_config = Column(JSON, nullable=False, default=dict)
    # placeholder_config structure:
    # {
    #   "candidate_name": {
    #       "x": 100, "y": 200, "font_size": 24,
    #       "font_color": "#000000", "alignment": "center",
    #       "font_name": "Helvetica-Bold", "enabled": true
    #   },
    #   "certificate_id": {...},
    #   "date": {...},
    #   "course_name": {...},
    #   "organization_name": {...},
    #   "organization_name_value": "Acme Corp"   <- static string
    # }
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    events = relationship("Event", back_populates="template")
