"""
Test paketi genelinde ortak fixture'lar.

İki test kökü var (`tests/` ve `app/tests/`) ve ikisi de aynı FastAPI
uygulamasını paylaşıyor. Süreç ömrü boyunca yaşayan durum (rate limit
sayaçları, dependency override'ları) testler arasında sızdığı için paket
ayrı ayrı geçip birlikte çalıştırıldığında düşüyordu.
"""
import pytest

from app.main import app
from app.core.limiter import limiter


@pytest.fixture(autouse=True)
def _isolate_app_state():
    """Her testi paylaşılan uygulama durumundan yalıtır.

    1) Rate limiter kapatılır. Limiter artık sayaçları Redis'te tutuyor
       (bkz. app/core/limiter.py), yani sayaçlar yalnızca testler arasında
       değil, test süreci ile çalışan dev sunucusu arasında da paylaşılıyor.
       Login gibi 5/dakika sınırı olan uçlara vuran testler bu yüzden
       sıralarına ve ortama göre 429 alıp rastgele düşüyordu. Rate limit
       davranışını test etmek isteyen bir test bunu kendi içinde açmalıdır.

    2) dependency_overrides testten önceki hâline geri alınır. Bir test
       `finally` bloğunu atlarsa (ya da hata fırlatırsa) override'ı sonraki
       testlere sızıyor ve alakasız hatalara yol açıyordu.
    """
    previous_enabled = limiter.enabled
    limiter.enabled = False
    previous_overrides = dict(app.dependency_overrides)
    try:
        yield
    finally:
        limiter.enabled = previous_enabled
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
