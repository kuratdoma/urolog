"""
Güvenlik yardımcı fonksiyonları - Dosya erişim ve yükleme güvenliği
"""

import os
from fastapi import HTTPException

# SEC-05: İzin verilen dosya uzantıları
ALLOWED_UPLOAD_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".gif",  # Görseller
    ".pdf",  # Belgeler
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",  # Office
    ".mp3",
    ".wav",
    ".m4a",
    ".webm",
    ".ogg",  # Ses
}

# Maksimum dosya boyutu: 50 MB
MAX_UPLOAD_SIZE = 50 * 1024 * 1024


def validate_file_path(file_path: str, allowed_base: str = "static/") -> str:
    """
    SEC-02: Path traversal saldırılarına karşı dosya yolunu doğrular.

    Args:
        file_path: Veritabanından veya kullanıcıdan gelen dosya yolu
        allowed_base: İzin verilen temel dizin (varsayılan: static/)

    Returns:
        Güvenli, normalize edilmiş göreceli dosya yolu

    Raises:
        HTTPException 403: Path traversal tespit edildiğinde
        HTTPException 404: Dosya bulunamadığında
    """
    if not file_path:
        raise HTTPException(status_code=404, detail="Dosya yolu belirtilmemiş")

    # Leading slash temizle
    relative_path = file_path.lstrip("/")

    # Resolve the absolute path to eliminate ../ sequences
    resolved = os.path.realpath(relative_path)
    allowed_resolved = os.path.realpath(allowed_base)

    # Path traversal kontrolü: resolved path, allowed_base ile başlamalı
    if (
        not resolved.startswith(allowed_resolved + os.sep)
        and resolved != allowed_resolved
    ):
        raise HTTPException(
            status_code=403,
            detail="Erişim reddedildi: İzin verilen dizin dışında dosya erişimi engellendi",
        )

    if not os.path.exists(resolved):
        raise HTTPException(status_code=404, detail="Dosya sunucuda bulunamadı")

    return resolved


def validate_upload_file(filename: str, content_length: int = 0) -> str:
    """
    SEC-05: Yüklenen dosyanın uzantısını ve boyutunu doğrular.

    Args:
        filename: Orijinal dosya adı
        content_length: Dosya boyutu (byte)

    Returns:
        Temizlenmiş dosya uzantısı (lowercase)

    Raises:
        HTTPException 400: Geçersiz dosya türü
        HTTPException 413: Dosya boyutu aşıldığında
    """
    if not filename:
        raise HTTPException(status_code=400, detail="Dosya adı belirtilmemiş")

    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya formatı: {file_ext}. İzin verilenler: {', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))}",
        )

    if content_length > MAX_UPLOAD_SIZE:
        max_mb = MAX_UPLOAD_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=413, detail=f"Dosya boyutu çok büyük. Maksimum: {max_mb} MB"
        )

    return file_ext


def validate_password(password: str) -> None:
    """
    SEC-06: Güçlü şifre politikası doğrulaması.
    Kurallar: Min 8 karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam.

    Args:
        password: Doğrulanacak şifre

    Raises:
        HTTPException 400: Şifre politikasına uygun değilse
    """
    errors = []

    if len(password) < 8:
        errors.append("en az 8 karakter")
    if not any(c.isupper() for c in password):
        errors.append("en az 1 büyük harf")
    if not any(c.islower() for c in password):
        errors.append("en az 1 küçük harf")
    if not any(c.isdigit() for c in password):
        errors.append("en az 1 rakam")

    if errors:
        raise HTTPException(
            status_code=400,
            detail=f"Şifre gereksinimleri: {', '.join(errors)} içermelidir.",
        )
