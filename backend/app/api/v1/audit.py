"""
Audit log helper — shared by all route modules.
"""

from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import AuditLog


async def log_action(
    db: AsyncSession,
    admin_id: Optional[Any],
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Persist an audit-log entry for an admin action.

    Parameters
    ----------
    db          : active async database session
    admin_id    : UUID of the acting admin (may be None for system actions)
    action      : short verb, e.g. "create", "update", "delete", "generate"
    resource    : resource type, e.g. "template", "event", "certificate"
    resource_id : string representation of the affected resource's primary key
    details     : arbitrary JSON-serialisable dict with extra context
    ip_address  : client IP if available
    """
    log = AuditLog(
        admin_id=admin_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(log)
    await db.commit()
