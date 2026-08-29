import asyncio
from app.services.consent_form_service import ConsentFormService, PatientConsentData
import io

async def test():
    service = ConsentFormService()
    data = PatientConsentData(
        hasta_adi_soyadi='Test Hasta',
        protokol_no='12345',
        doktor_adi_soyadi='Dr. Ahmet',
        tarih='05/07/2026',
        saat='14:30',
        sikayet='İdrar yaparken yanma',
        ozgecmis='Hipertansiyon',
        ilaclar='Parol',
        aliskanliklar='Sigara (1 paket/gün)'
    )
    
    stream = service.generate('USG_ve_floroskopi_kilavuzlugunda_perkutan_nefrostomi_Bilgilendirilmis_onam_formu', data)
    print('PDF generated successfully.')

asyncio.run(test())
