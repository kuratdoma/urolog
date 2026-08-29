import asyncio
import json
from app.db.session import SessionLocal
from app.models.system import SystemSetting
from app.repositories.setting_repository import SettingRepository

async def seed_settings():
    defaults = [
        {"key": "clinic_name", "value": "UroLog Üroloji Kliniği", "description": "Klinik Adı"},
        {"key": "clinic_phone", "value": "+90 212 555 10 20", "description": "Klinik Telefonu"},
        {"key": "clinic_address", "value": "Doktorlar Cad. No:1 Kat:2 Şişli/İstanbul", "description": "Klinik Adresi"},
        {"key": "working_hours", "value": json.dumps({
            "weekdayStart": "09:00",
            "weekdayEnd": "18:00",
            "weekendStart": "09:00",
            "weekendEnd": "14:00",
            "isWeekendActive": True
        }), "description": "Çalışma Saatleri"},
        {"key": "theme_dark_mode", "value": "false", "description": "Karanlık Mod"},
        {"key": "theme_compact", "value": "false", "description": "Kompakt Görünüm"},
        {"key": "system_logo_width", "value": "100", "description": "Logo Genişliği"},
        {"key": "iletisim_kaynaklari", "value": json.dumps(["Telefon", "Whatsapp", "Email", "Google", "Sosyal Medya", "Tavsiye", "Diğer"]), "description": "İletişim Kaynak Seçenekleri"}
    ]

    async with SessionLocal() as session:
        repo = SettingRepository(session)
        print("Seeding settings...")
        for setting in defaults:
            current = await repo.get(setting["key"])
            if not current:
                print(f"Creating default setting: {setting['key']}")
                await repo.create_or_update(
                    key=setting["key"],
                    value=setting["value"],
                    description=setting["description"]
                )
            else:
                print(f"Setting {setting['key']} already exists.")
        
        print("Settings seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_settings())
