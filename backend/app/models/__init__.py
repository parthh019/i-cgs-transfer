# Import all models so SQLAlchemy metadata is populated and
# Alembic can detect all tables automatically.

from app.models.admin import Admin  # noqa: F401
from app.models.template import Template  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.certificate import Certificate, AuditLog  # noqa: F401
