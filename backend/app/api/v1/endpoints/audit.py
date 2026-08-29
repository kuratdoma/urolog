from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.api import deps
from app.core.permissions import UserRole
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLog as AuditLogSchema

router = APIRouter(redirect_slashes=False)


@router.get("", response_model=List[AuditLogSchema])
async def get_audit_logs(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve audit logs. Only accessible by superusers.
    """

    # Build query with join to get usernames and emails
    query = (
        select(AuditLog, User.username, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(desc(AuditLog.created_at))
    )

    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    # Transform rows to include identifier (email or username)
    audit_logs = []
    for row in rows:
        log = row[0]  # AuditLog object
        username = row[1]  # username from User table
        email = row[2]  # email from User table

        audit_logs.append(
            {
                "id": str(log.id),
                "action": log.action,
                "user_id": log.user_id,
                "username": email or username or "Sistem",
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at,
            }
        )

    return audit_logs
