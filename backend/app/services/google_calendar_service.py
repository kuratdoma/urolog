"""
Google Calendar Service
=======================
Handles Google Calendar API operations including:
- OAuth token management
- Calendar creation/lookup
- Event sync (create, update, delete)
"""

from datetime import datetime, timezone
from typing import Optional, Tuple
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user_oauth import UserOAuth
from app.models.appointment import Randevu
from app.core.config import settings


class GoogleCalendarService:
    """Service for Google Calendar sync operations."""

    SCOPES = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar",
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_client_credentials(self) -> Tuple[str, str]:
        """Google OAuth Client ID ve Secret değerlerini DB'den (şifreli) veya fallback olarak env'den okur."""
        from app.repositories.setting_repository import SettingRepository
        from app.core.security import decrypt_value
        
        repo = SettingRepository(self.db)
        client_id_setting = await repo.get("google_client_id")
        client_secret_setting = await repo.get("google_client_secret")
        
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
        
        if client_id_setting and client_id_setting.value:
            try:
                client_id = decrypt_value(client_id_setting.value)
            except Exception:
                client_id = client_id_setting.value
                
        if client_secret_setting and client_secret_setting.value:
            try:
                client_secret = decrypt_value(client_secret_setting.value)
            except Exception:
                client_secret = client_secret_setting.value
                
        return client_id, client_secret

    async def get_credentials(self, user_id: int) -> Optional[Credentials]:
        """
        Get Google OAuth credentials for a user.
        Refreshes token if expired.
        """
        if not user_id:
            return None

        result = await self.db.execute(
            select(UserOAuth).filter(
                UserOAuth.user_id == user_id, UserOAuth.provider == "google"
            )
        )
        db_oauth = result.scalars().first()

        if not db_oauth:
            return None

        client_id, client_secret = await self._get_client_credentials()

        credentials = Credentials(
            token=db_oauth.access_token,
            refresh_token=db_oauth.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=db_oauth.scopes.split(",") if db_oauth.scopes else self.SCOPES,
        )

        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                # Update tokens in DB
                db_oauth.access_token = credentials.token
                db_oauth.token_expiry = credentials.expiry
                await self.db.commit()
            except Exception as e:
                print(f"Token refresh failed: {e}")
                return None

        return credentials

    async def get_effective_credentials(self, appointment_doctor_id: Optional[int], original_user_id: int) -> Tuple[Optional[Credentials], Optional[int]]:
        """
        Yetki Önceliği Hiyerarşisi:
        1. Randevunun atandığı doktor
        2. İşlemi gerçekleştiren kullanıcı (original_user_id)
        3. Sistemdeki en eski/kök ortak yetki (created_at.asc)
        """
        # 1. Doktorun yetkisi var mı?
        if appointment_doctor_id:
            creds = await self.get_credentials(appointment_doctor_id)
            if creds:
                return creds, appointment_doctor_id

        # 2. İşlemi yapanın yetkisi var mı?
        creds = await self.get_credentials(original_user_id)
        if creds:
            return creds, original_user_id

        # 3. İkisi de yoksa sistemdeki herhangi bir yetkiyi al (ortak takvim için)
        result = await self.db.execute(
            select(UserOAuth)
            .filter(UserOAuth.provider == "google")
            .order_by(UserOAuth.created_at.asc())
            .limit(1)
        )
        db_oauth = result.scalars().first()
        if db_oauth:
            creds = await self.get_credentials(db_oauth.user_id)
            if creds:
                return creds, db_oauth.user_id

        return None, None

    async def get_calendar_id(self) -> str:
        """Sistem ayarlarından manuel girilen takvim ID'sini okur, yoksa 'primary' döner."""
        from app.repositories.setting_repository import SettingRepository
        repo = SettingRepository(self.db)
        setting = await repo.get("google_calendar_id")
        if setting and setting.value:
            val = setting.value.strip()
            if val and val != "••••••••••••••••":
                return val
        return "primary"

    async def sync_appointment(
        self, appointment: Randevu, user_id: int
    ) -> Tuple[bool, str]:
        """
        Sync an appointment to Google Calendar.
        Creates new event or updates existing one.
        Returns (success, message).
        """
        credentials = await self.get_credentials(user_id)
        if not credentials:
            return False, "Google hesabı bağlı değil"

        try:
            service = build("calendar", "v3", credentials=credentials)
            calendar_id = await self.get_calendar_id()

            event = {
                "summary": appointment.title,
                "description": self._build_description(appointment),
                "start": {
                    "dateTime": appointment.start.isoformat(),
                    "timeZone": "Europe/Istanbul",
                },
                "end": {
                    "dateTime": appointment.end.isoformat(),
                    "timeZone": "Europe/Istanbul",
                },
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 30},
                    ],
                },
            }

            if appointment.google_event_id:
                # Update existing event
                updated_event = (
                    service.events()
                    .update(
                        calendarId=calendar_id,
                        eventId=appointment.google_event_id,
                        body=event,
                    )
                    .execute()
                )
                event_id = updated_event["id"]
                message = "Randevu Google Calendar'da güncellendi"
            else:
                # Create new event
                created_event = (
                    service.events()
                    .insert(calendarId=calendar_id, body=event)
                    .execute()
                )
                event_id = created_event["id"]
                message = "Randevu Google Calendar'a eklendi"

            # Update appointment with sync info
            appointment.google_event_id = event_id
            appointment.google_calendar_id = calendar_id
            appointment.last_synced_at = datetime.now(timezone.utc)
            await self.db.commit()

            return True, message

        except Exception as e:
            return False, f"Senkronizasyon hatası: {str(e)}"

    async def delete_from_calendar(
        self, appointment: Randevu, user_id: int
    ) -> Tuple[bool, str]:
        """
        Delete an event from Google Calendar.
        """
        if not appointment.google_event_id:
            return True, "Etkinlik zaten takvimde yok"

        credentials = await self.get_credentials(user_id)
        if not credentials:
            return False, "Google hesabı bağlı değil"

        try:
            service = build("calendar", "v3", credentials=credentials)
            calendar_id = (
                appointment.google_calendar_id
                or await self.get_calendar_id()
            )

            service.events().delete(
                calendarId=calendar_id, eventId=appointment.google_event_id
            ).execute()

            # Clear sync info
            appointment.google_event_id = None
            appointment.google_calendar_id = None
            appointment.last_synced_at = None
            await self.db.commit()

            return True, "Etkinlik Google Calendar'dan silindi"

        except Exception as e:
            return False, f"Silme hatası: {str(e)}"

    def _build_description(self, appointment: Randevu) -> str:
        """Build event description from appointment details."""
        lines = []

        if appointment.doctor_name:
            lines.append(f"Doktor: {appointment.doctor_name}")
        if appointment.type:
            lines.append(f"Randevu Tipi: {appointment.type}")
        if appointment.hasta and appointment.hasta.cep_tel:
            lines.append(f"Patient Phone: {appointment.hasta.cep_tel}")

        from zoneinfo import ZoneInfo
        from datetime import timezone
        tz = ZoneInfo("Europe/Istanbul")
        
        def to_ist(dt):
            if not dt: return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(tz)

        created_dt = to_ist(appointment.created_at)
        updated_dt = to_ist(appointment.updated_at) or created_dt

        created_by = appointment.created_by_name or "Bilinmiyor"
        updated_by = appointment.updated_by_name or created_by

        if created_dt:
            lines.append(f"Created: {created_dt.strftime('%d.%m.%Y %H:%M')}")
            lines.append(f"Created By: {created_by}")

        if updated_dt:
            lines.append(f"Last Modified: {updated_dt.strftime('%d.%m.%Y %H:%M')}")
            lines.append(f"Last Modified By: {updated_by}")

        return "\n".join(lines)
