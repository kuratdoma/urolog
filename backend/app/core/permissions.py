"""
UroLOG — Role-Based Access Control (RBAC) Permission Registry

Defines the canonical permission matrix:
Which roles can access which modules at which CRUD level.

This is the single source of truth for all authorization decisions.
"""

from enum import Enum
from typing import FrozenSet, Dict, Set


class UserRole(str, Enum):
    """Sistem kullanıcı rolleri — strict enum, no free-text."""
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    FRONTDESK = "FRONTDESK"
    TECHNICIAN = "TECHNICIAN"


class Action(str, Enum):
    """CRUD operasyon tipleri."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"


# Shorthand constants for readability
_C = Action.CREATE
_R = Action.READ
_U = Action.UPDATE
_D = Action.DELETE

_CRUD: FrozenSet[Action] = frozenset({_C, _R, _U, _D})
_CRU: FrozenSet[Action] = frozenset({_C, _R, _U})
_CR: FrozenSet[Action] = frozenset({_C, _R})
_R_ONLY: FrozenSet[Action] = frozenset({_R})
_NONE: FrozenSet[Action] = frozenset()


# ─── Permission Matrix ────────────────────────────────────────────
# Key: module name (matches API router tag / frontend route segment)
# Value: dict mapping UserRole → allowed actions
#
# This matrix mirrors the approved blueprint exactly.

PERMISSION_MATRIX: Dict[str, Dict[UserRole, FrozenSet[Action]]] = {
    "dashboard": {
        UserRole.ADMIN: _R_ONLY,
        UserRole.DOCTOR: _R_ONLY,
        UserRole.NURSE: _R_ONLY,
        UserRole.FRONTDESK: _R_ONLY,
        UserRole.TECHNICIAN: _R_ONLY,
    },
    "patients": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _CRU,
        UserRole.FRONTDESK: _CRU,
        UserRole.TECHNICIAN: _R_ONLY,
    },
    "clinical": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _CRU,
        UserRole.FRONTDESK: _R_ONLY,
        UserRole.TECHNICIAN: _R_ONLY,
    },
    "operations": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _R_ONLY,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "imaging": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _CRU,
        UserRole.FRONTDESK: _R_ONLY,
        UserRole.TECHNICIAN: _CRUD,
    },
    "lab": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _CRU,
        UserRole.FRONTDESK: _R_ONLY,
        UserRole.TECHNICIAN: _CRUD,
    },
    "appointments": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _CRUD,
        UserRole.FRONTDESK: _CRUD,
        UserRole.TECHNICIAN: _R_ONLY,
    },
    "finance": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _R_ONLY,
        UserRole.NURSE: _NONE,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "stock": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _R_ONLY,
        UserRole.NURSE: _R_ONLY,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "reports": {
        UserRole.ADMIN: _R_ONLY,
        UserRole.DOCTOR: _R_ONLY,
        UserRole.NURSE: _NONE,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "settings": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _NONE,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "auth": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _NONE,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "audit": {
        UserRole.ADMIN: _R_ONLY,
        UserRole.DOCTOR: _NONE,
        UserRole.NURSE: _NONE,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "ai-scribe": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _NONE,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
    "documents": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _CRU,
        UserRole.FRONTDESK: _R_ONLY,
        UserRole.TECHNICIAN: _R_ONLY,
    },
    "definitions": {
        UserRole.ADMIN: _CRUD,
        UserRole.DOCTOR: _CRUD,
        UserRole.NURSE: _R_ONLY,
        UserRole.FRONTDESK: _NONE,
        UserRole.TECHNICIAN: _NONE,
    },
}


def has_permission(role: UserRole, module: str, action: Action) -> bool:
    """
    Central authorization check.

    Args:
        role: The user's role enum value
        module: The module key (must match PERMISSION_MATRIX keys)
        action: The CRUD action being attempted

    Returns:
        True if permitted, False otherwise
    """
    module_perms = PERMISSION_MATRIX.get(module)
    if module_perms is None:
        # Unlisted module → deny by default (fail-closed)
        return False

    allowed_actions = module_perms.get(role, _NONE)
    return action in allowed_actions


def get_accessible_modules(role: UserRole) -> Set[str]:
    """
    Returns set of module names the role can access (at least READ).
    Used by frontend to filter sidebar visibility.
    """
    return {
        module
        for module, perms in PERMISSION_MATRIX.items()
        if _R in perms.get(role, _NONE)
    }
