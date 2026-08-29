from ics import Calendar, Event
from app.models.appointment import Randevu
import io


def generate_ics_content(randevu: Randevu) -> str:
    """
    Verilen randevu objesi için iCal (.ics) formatında içerik üretir.
    """
    c = Calendar()
    e = Event()

    # Başlık: Hasta Adı - Randevu Tipi
    hasta_adi = (
        f"{randevu.hasta.ad} {randevu.hasta.soyad}"
        if randevu.hasta
        else "Bilinmeyen Hasta"
    )
    e.name = f"{hasta_adi} - {randevu.title}"

    # Zaman ayarları
    # Randevu start/end zaten datetime (timezone aware) objeleridir
    e.begin = randevu.start
    e.end = randevu.end

    # Detaylar
    desc = []
    if randevu.type:
        desc.append(f"Tip: {randevu.type}")
    if randevu.doctor_name:
        desc.append(f"Doktor: {randevu.doctor_name}")
    if randevu.notes:
        desc.append(f"Notlar: {randevu.notes}")

    e.description = "\n".join(desc)

    # Konum (Opsiyonel - Uygulamanın bir hastane/klinik adresi varsa eklenebilir)
    # e.location = "Klinik Adresi"

    c.events.add(e)
    return str(c)


def generate_ics_file_response(randevu: Randevu):
    """
    Gelecekte FastAPI StreamingResponse için kullanılabilir
    """
    content = generate_ics_content(randevu)
    return io.StringIO(content)
