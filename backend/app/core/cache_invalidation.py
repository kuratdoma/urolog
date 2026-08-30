"""
Cache namespace'leri ve invalidasyon yardımcısı.

`@cache(expire=3600)` ile önbelleğe alınan tanım listeleri (kurumlar, meslekler,
sigortalar, ICD, ilaçlar ...) yazma uçlarından sonra temizlenmezse, admin bir
kayıt eklediğinde değişiklik bir saate kadar listede görünmüyordu. Her kaynak
kendi namespace'ini kullanır; böylece bir kurumu güncellemek ICD veya ilaç
önbelleğini boşuna düşürmez.

Kullanım:

    @router.get("/kurumlar")
    @cache(expire=3600, namespace=CacheNS.KURUMLAR)
    async def get_kurumlar(...): ...

    @router.post("/kurumlar")
    async def create_kurum(...):
        result = await repo.create_kurum(...)
        await invalidate(CacheNS.KURUMLAR)
        return result
"""

import logging

from fastapi_cache import FastAPICache

logger = logging.getLogger("urolog_backend")


class CacheNS:
    """Uzun TTL'li önbellek namespace'leri (tek kaynak)."""

    KURUMLAR = "def:kurumlar"
    MESLEKLER = "def:meslekler"
    SIGORTALAR = "def:sigortalar"
    ANESTEZI = "def:anestezi"
    RANDEVU_TURLERI = "def:randevu-turleri"
    ICD = "def:icd"
    DRUGS = "def:drugs"
    DOKTORLAR = "def:doktorlar"
    TAKIP_KONULARI = "def:takip-konulari"
    RECETE_SABLONLARI = "def:recete-sablonlari"
    # Bootstrap cache'i — GET /definitions/bootstrap yanıtını saklar.
    # Herhangi bir tanım listesi değiştiğinde bu da temizlenmelidir.
    BOOTSTRAP = "def:bootstrap"


async def invalidate(*namespaces: str) -> None:
    """
    Verilen namespace'lerdeki önbelleği temizler.

    Namespace prefix'siz verilir: `FastAPICache.clear` deseni kurarken
    `"{prefix}:{namespace}:*"` biçimine kendisi çeviriyor. Prefix'i burada
    ayrıca eklemek desenin hiçbir anahtarla eşleşmemesine ve temizliğin
    sessizce hiçbir şey yapmamasına yol açar.

    Önbellek temizliği yazma işleminin başarısını etkilememeli: cache backend
    başlatılmamışsa veya Redis düşmüşse hata yutulur ve loglanır, çünkü kayıt
    zaten veritabanına yazılmış durumdadır.
    """
    for ns in namespaces:
        try:
            await FastAPICache.clear(namespace=ns)
        except Exception as exc:  # pragma: no cover - altyapı durumuna bağlı
            logger.warning("Cache invalidasyonu başarısız (namespace=%s): %s", ns, exc)
