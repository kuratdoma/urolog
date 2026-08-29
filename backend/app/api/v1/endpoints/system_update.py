import asyncio
import os
import subprocess
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core.security import verify_password, get_password_hash
from app.models.user import User
from app.core.permissions import UserRole

router = APIRouter()
logger = logging.getLogger(__name__)

# Global kilit: Aynı anda birden fazla güncelleme çalışmasını engellemek için
update_lock = asyncio.Lock()
is_update_running = False

class SuperuserAuthRequest(BaseModel):
    username: str
    password: str

class SetupSuperuserRequest(BaseModel):
    password: str

import httpx
from app.core.config import settings

@router.get("/status")
async def get_system_update_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN)),
) -> Dict[str, Any]:
    """
    Yerel Git reposu ve SSH Deploy Key üzerinden GitHub remote (origin/main) commit durumunu sorgular.
    """
    # 1. Superuser kontrolü
    result = await db.execute(select(User).filter(User.username == "superuser"))
    has_superuser = result.scalars().first() is not None

    project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    git_env = os.environ.copy()
    git_env["GIT_SSH_COMMAND"] = "ssh -o StrictHostKeyChecking=no"

    # 2. SSH Deploy Key & Git ile Kontrol
    try:
        # 2a. Remote'daki son commit SHA'sını doğrudan git ls-remote ile anında öğren
        ls_remote_proc = subprocess.run(
            ["git", "ls-remote", "origin", "refs/heads/main"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=15,
            env=git_env
        )
        
        remote_sha = ""
        if ls_remote_proc.returncode == 0 and ls_remote_proc.stdout.strip():
            remote_sha = ls_remote_proc.stdout.strip().split()[0][:7]
        
        # 2b. Remote güncellemeleri yerel veritabanına çek (fetch)
        fetch_proc = subprocess.run(
            ["git", "fetch", "origin", "main:refs/remotes/origin/main"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=30,
            env=git_env
        )
        if fetch_proc.returncode != 0:
            logger.warning(f"git fetch warning: {fetch_proc.stderr}")

        # Mevcut yüklü commit SHA ve mesajı
        local_sha = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=project_dir,
            text=True,
            env=git_env
        ).strip()
        local_msg = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%B"],
            cwd=project_dir,
            text=True,
            env=git_env
        ).strip().split("\n")[0]

        # Eğer ls-remote ile remote SHA alınamadıysa origin/main veya FETCH_HEAD'den oku
        if not remote_sha:
            try:
                remote_sha = subprocess.check_output(
                    ["git", "rev-parse", "--short", "origin/main"],
                    cwd=project_dir,
                    text=True,
                    env=git_env
                ).strip()
            except Exception:
                remote_sha = local_sha

        remote_msg = "GitHub'daki en son sürüm"
        try:
            remote_msg = subprocess.check_output(
                ["git", "log", "-1", "--pretty=%B", "origin/main"],
                cwd=project_dir,
                text=True,
                env=git_env
            ).strip().split("\n")[0]
        except Exception:
            pass

        update_available = (local_sha != remote_sha)
        changelog: List[str] = []

        if update_available:
            try:
                log_output = subprocess.check_output(
                    ["git", "log", f"{local_sha}..origin/main", "--oneline"],
                    cwd=project_dir,
                    text=True,
                    env=git_env
                ).strip()
                if log_output:
                    changelog = log_output.split("\n")
            except Exception:
                changelog = [f"{remote_sha} Yeni güncellemeler mevcut."]

        return {
            "update_available": update_available,
            "current_version": {
                "sha": local_sha,
                "message": local_msg
            },
            "latest_version": {
                "sha": remote_sha,
                "message": remote_msg
            },
            "changelog": changelog,
            "is_update_running": is_update_running,
            "has_superuser": has_superuser
        }
    except Exception as git_err:
        logger.warning(f"Git SSH check failed: {git_err}. Trying GitHub API fallback...")

    # 3. İkincil Fallback: GitHub API
    current_sha = os.getenv("GIT_SHA") or getattr(settings, "GIT_SHA", "latest")
    repo_name = os.getenv("GITHUB_REPO") or getattr(settings, "GITHUB_REPO", "kuratdoma/urolog")
    github_token = os.getenv("GITHUB_TOKEN") or getattr(settings, "GITHUB_TOKEN", "")
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "UroLog-SystemUpdate"
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"https://api.github.com/repos/{repo_name}/commits?per_page=15", headers=headers)
            if res.status_code == 200:
                commits = res.json()
                if commits and isinstance(commits, list):
                    latest_commit = commits[0]
                    remote_sha = latest_commit["sha"][:7]
                    remote_msg = latest_commit["commit"]["message"].split("\n")[0]
                    
                    update_available = (current_sha != remote_sha and current_sha != "latest")
                    changelog = []
                    for c in commits:
                        c_sha = c["sha"][:7]
                        if c_sha == current_sha:
                            break
                        msg = c["commit"]["message"].split("\n")[0]
                        changelog.append(f"{c_sha} {msg}")
                        
                    return {
                        "update_available": update_available,
                        "current_version": {
                            "sha": current_sha,
                            "message": "Yüklü Sürüm"
                        },
                        "latest_version": {
                            "sha": remote_sha,
                            "message": remote_msg
                        },
                        "changelog": changelog,
                        "is_update_running": is_update_running,
                        "has_superuser": has_superuser
                    }
    except Exception as api_err:
        logger.error(f"GitHub API fallback also failed: {api_err}")

    return {
        "update_available": False,
        "current_version": {"sha": current_sha, "message": "Yüklü Sürüm"},
        "latest_version": {"sha": current_sha},
        "changelog": [],
        "error": "Git SSH Deploy Key ile GitHub güncelleme kontrolü yapılamadı.",
        "is_update_running": is_update_running,
        "has_superuser": has_superuser
    }

@router.post("/setup-superuser")
async def setup_superuser(
    setup_data: SetupSuperuserRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN)),
) -> Dict[str, Any]:
    """
    Sisteme ilk kez girildiğinde superuser için şifre oluşturur.
    Şifre kurallarına uygunluğu (min 8 karakter vs.) frontend'de doğrulanmış varsayılır.
    """
    result = await db.execute(select(User).filter(User.username == "superuser"))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Superuser hesabı zaten oluşturulmuş!"
        )
    
    # Yeni superuser oluştur
    hashed_password = get_password_hash(setup_data.password)
    new_superuser = User(
        username="superuser",
        full_name="Super Administrator",
        hashed_password=hashed_password,
        role=UserRole.ADMIN,
        is_superuser=True,
        is_active=True,
        skip_audit=True
    )
    
    db.add(new_superuser)
    await db.commit()
    
    return {"message": "Superuser hesabı başarıyla oluşturuldu."}

@router.post("/update")
async def trigger_system_update(
    auth_data: SuperuserAuthRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.require_role(UserRole.ADMIN)),
) -> Dict[str, Any]:
    """
    Superuser doğrulaması yapar ve güncelleme işlemini başlatır.
    """
    global is_update_running
    
    # 1. Superuser doğrulama (Veritabanından)
    if auth_data.username != "superuser":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yalnızca 'superuser' hesabı ile güncelleme yapılabilir!"
        )
        
    result = await db.execute(select(User).filter(User.username == "superuser"))
    superuser = result.scalars().first()
    
    if not superuser or not superuser.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Superuser hesabı bulunamadı. Lütfen önce kurulumu tamamlayın."
        )
        
    if not verify_password(auth_data.password, superuser.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz Süper Kullanıcı (superuser) parolası!"
        )
    
    if is_update_running:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zaten devam eden bir güncelleme işlemi var!"
        )
    
    return {
        "status": "authorized",
        "message": "Süper kullanıcı doğrulaması başarılı. Güncelleme WebSocket üzerinden takip edilebilir."
    }

@router.websocket("/ws-logs")
async def websocket_update_logs(websocket: WebSocket):
    """
    Güncelleme script'ini (system_update.sh) çalıştırır ve çıktıları canlı akar.
    WebSocket bağlantısı JWT token doğrulaması gerektirir (query param: ?token=...).
    """
    global is_update_running
    
    # 1. Önce bağlantıyı kabul et (Nginx handshake için zorunlu)
    await websocket.accept()
    
    # 2. Token doğrulama
    token = websocket.query_params.get("token")
    if not token:
        await websocket.send_text("❌ [Hata] Oturum anahtarı (token) bulunamadı.\n")
        await websocket.close(code=4001)
        return
    
    try:
        from app.db.session import SessionLocal
        async with SessionLocal() as db:
            user = await deps.validate_token(token, db)
            if user.role != UserRole.ADMIN and not user.is_superuser:
                await websocket.send_text("❌ [Hata] Bu işlem için Admin yetkisi gereklidir.\n")
                await websocket.close(code=4003)
                return
    except Exception as e:
        await websocket.send_text(f"❌ [Hata] Geçersiz veya süresi dolmuş token: {str(e)}\n")
        await websocket.close(code=4001)
        return
    
    if is_update_running:
        await websocket.send_text("⚠️ UYARI: Zaten devam eden bir güncelleme işlemi var!\n")
        await websocket.close()
        return
    
    project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    script_path = os.path.join(project_dir, "update_scripts/system_update.sh")
    if not os.path.exists(script_path):
        script_path = os.path.join(project_dir, "scripts/system_update.sh")
    
    if not os.path.exists(script_path):
        await websocket.send_text(f"❌ HATA: Güncelleme script'i bulunamadı: {script_path}\n")
        await websocket.close()
        return
    
    async with update_lock:
        is_update_running = True
        try:
            await websocket.send_text("🚀 [Sistem] Güncelleme işlemi başlatılıyor...\n")
            await websocket.send_text(f"📁 Çalıştırma Dizini: {project_dir}\n\n")
            
            # Script'i subprocess olarak çalıştır
            process = await asyncio.create_subprocess_exec(
                "bash", script_path,
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT
            )
            
            # Subprocess çıktısını satır satır okuyup websocket'e fırlat
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded_line = line.decode('utf-8', errors='replace')
                await websocket.send_text(decoded_line)
                await asyncio.sleep(0.01) # Event loop rahatlatma
                
            await process.wait()
            
            if process.returncode == 0:
                await websocket.send_text("\n🎉 [Sistem] Güncelleme başarıyla tamamlandı! Servisler yeniden başlatılıyor...\n")
            else:
                await websocket.send_text(f"\n❌ [Sistem] Güncelleme hatayla sonlandı! Exit Code: {process.returncode}\n")
                
        except WebSocketDisconnect:
            logger.info("WebSocket istemci bağlantısı kesildi.")
        except Exception as e:
            logger.error(f"WebSocket update logs error: {str(e)}")
            try:
                await websocket.send_text(f"\n❌ Hata oluştu: {str(e)}\n")
            except Exception:
                pass
        finally:
            is_update_running = False
            try:
                await websocket.close()
            except Exception:
                pass

@router.get("/setup-readme")
async def get_setup_readme(
    current_user: User = Depends(deps.require_role(UserRole.ADMIN)),
) -> Dict[str, str]:
    """
    DEPLOYMENT_SETUP.md içeriğini okuyup döndürür.
    """
    project_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    readme_path = os.path.join(project_dir, "DEPLOYMENT_SETUP.md")
    
    if not os.path.exists(readme_path):
        return {"content": "Rehber dökümanı bulunamadı."}
    
    with open(readme_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    return {"content": content}
