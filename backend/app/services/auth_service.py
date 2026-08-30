from fastapi import HTTPException, status
from app.core import security
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def authenticate_user(self, identifier: str, password: str) -> dict:
        """
        Authenticate user by email or username and password.

        Args:
            identifier: User's email address or username
            password: User's password

        Returns:
            dict with access_token, refresh_token, token_type, user_id

            user_id, çağıranın (login endpoint'i) audit kaydı için kullanıcıyı
            tekrar sorgulamak zorunda kalmaması içindir; endpoint yanıt gövdesini
            bu dict'ten alan alan kurar, bu yüzden dışarı sızmaz.
        """
        user = await self.user_repo.get_by_email_or_username(identifier)

        if not user or not security.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email veya şifre hatalı",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(status_code=400, detail="Hesap devre dışı")

        return {
            "access_token": security.create_access_token(
                user.id,
                name=user.full_name or user.email,
                username=user.username,
                email=user.email,
                role=user.role,
                clinic_id=user.clinic_id,
                is_superuser=user.is_superuser,
            ),
            "refresh_token": security.create_refresh_token(
                user.id,
                name=user.full_name or user.email,
                username=user.username,
                email=user.email,
                role=user.role,
                clinic_id=user.clinic_id,
                is_superuser=user.is_superuser,
            ),
            "token_type": "bearer",
            "user_id": user.id,
        }
