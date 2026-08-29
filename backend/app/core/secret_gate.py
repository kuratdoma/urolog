import logging
import secrets
import os
from .config import settings

logger = logging.getLogger(__name__)


def validate_vault_connectivity():
    """
    Simulated Secret Gate: Verifies that crucial secrets are injected
    via Environment Variables and not solely relying on .env defaults.
    """
    critical_secrets = ["SECRET_KEY", "DB_PASSWORD"]

    if settings.ENVIRONMENT == "production":
        for secret in critical_secrets:
            if not os.environ.get(secret):
                logger.critical(
                    "SEC-GATE: %s is injected via .env, not direct ENV VAR.", secret
                )
                raise RuntimeError(f"CRITICAL: {secret} must be set as a direct environment variable in production, not via .env file.")

    return True


def generate_ephemeral_key():
    """Generates a secure key for temporary sessions."""
    return secrets.token_hex(64)
