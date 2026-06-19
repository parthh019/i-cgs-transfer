"""
Dashboard routes (requires auth):
  GET /stats            — aggregate system stats
  GET /recent-activity  — last 20 audit log entries
  GET /audit-logs       — paginated audit logs with filters
"""

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.admin import Admin
from app.models.certificate import AuditLog, Certificate
from app.models.event import Event
from app.models.template import Template

router = APIRouter()
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  Stats
# ────────────────────────────────────────────────────────────────────────────


@router.get("/stats", summary="Dashboard aggregate statistics")
async def get_stats(
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return system-wide aggregated statistics for the dashboard."""

    async def scalar(query) -> int:
        result = await db.execute(query)
        return result.scalar_one() or 0

    today = date.today()

    total_certificates = await scalar(
        select(func.count()).select_from(Certificate)
    )
    total_events = await scalar(
        select(func.count()).select_from(Event)
    )
    total_templates = await scalar(
        select(func.count()).select_from(Template)
    )
    total_emails_sent = await scalar(
        select(func.count()).select_from(Certificate).where(
            Certificate.email_sent == True  # noqa: E712
        )
    )
    certificates_today = await scalar(
        select(func.count()).select_from(Certificate).where(
            func.date(Certificate.created_at) == today
        )
    )
    pending_certificates = await scalar(
        select(func.count()).select_from(Certificate).where(
            Certificate.status == "pending"
        )
    )
    failed_certificates = await scalar(
        select(func.count()).select_from(Certificate).where(
            Certificate.status == "failed"
        )
    )

    # Events by status
    events_by_status: Dict[str, int] = {"draft": 0, "processing": 0, "completed": 0, "failed": 0}
    status_result = await db.execute(
        select(Event.status, func.count()).group_by(Event.status)
    )
    for ev_status, count in status_result.all():
        if ev_status in events_by_status:
            events_by_status[ev_status] = count
        else:
            events_by_status[ev_status] = count

    return {
        "total_certificates": total_certificates,
        "total_events": total_events,
        "total_templates": total_templates,
        "total_emails_sent": total_emails_sent,
        "certificates_today": certificates_today,
        "pending_certificates": pending_certificates,
        "failed_certificates": failed_certificates,
        "events_by_status": events_by_status,
    }


# ────────────────────────────────────────────────────────────────────────────
#  Recent activity
# ────────────────────────────────────────────────────────────────────────────


@router.get("/recent-activity", summary="Last 20 audit log entries")
async def get_recent_activity(
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return the 20 most recent audit log entries, joined with admin name."""
    result = await db.execute(
        select(AuditLog, Admin.name.label("admin_name"))
        .outerjoin(Admin, AuditLog.admin_id == Admin.id)
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    rows = result.all()

    items = []
    for log, admin_name in rows:
        items.append(
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id) if log.admin_id else None,
                "admin_name": admin_name or "System",
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
        )

    return {"items": items, "total": len(items)}


# ────────────────────────────────────────────────────────────────────────────
#  Audit logs (paginated)
# ────────────────────────────────────────────────────────────────────────────


@router.get("/audit-logs", summary="Paginated audit logs with optional filters")
async def get_audit_logs(
    action: Optional[str] = None,
    resource: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return paginated audit logs, filterable by action type and resource type."""
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    query = select(AuditLog, Admin.name.label("admin_name")).outerjoin(
        Admin, AuditLog.admin_id == Admin.id
    )

    if action:
        query = query.where(AuditLog.action == action)
    if resource:
        query = query.where(AuditLog.resource == resource)

    # Total count
    count_q = select(func.count()).select_from(AuditLog)
    if action:
        count_q = count_q.where(AuditLog.action == action)
    if resource:
        count_q = count_q.where(AuditLog.resource == resource)

    count_result = await db.execute(count_q)
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    )
    rows = result.all()

    items = []
    for log, admin_name in rows:
        items.append(
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id) if log.admin_id else None,
                "admin_name": admin_name or "System",
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size}
