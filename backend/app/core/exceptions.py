from fastapi import Request
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional


class AppError(Exception):
    """
    Standartlaştırılmış özel uygulama hatası (Base Application Error).
    Sistem genelinde fırlatılan iş mantığı hataları bu sınıftan türemeli veya
    doğrudan bu sınıf ile fırlatılmalıdır.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        context: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.context = context or {}


class ShardRoutingError(AppError):
    """Shard rotalama ile ilgili (Geçersiz veya yetkisiz shard erişimi) hataları sarmalar."""

    def __init__(
        self,
        message: str = "Yetkisiz veya geçersiz shard erişimi denemesi. (Tenant Isolated)",
    ):
        super().__init__(
            message=message, status_code=403, context={"error_type": "shard_routing"}
        )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """
    AppError tipi fırlatıldığında otomatik olarak devreye giren Global FastAPI Handler.
    PRD'ye uygun olarak Standart API Wrapper (data, meta, error) döner.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": None,
            "meta": None,
            "error": {"message": exc.message, "context": exc.context},
        },
    )
