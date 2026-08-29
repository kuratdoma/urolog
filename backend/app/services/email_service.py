"""
Email Service - Brevo SMTP Integration
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send email using Brevo SMTP.
    Returns True if successful, False otherwise.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

        print(f"[EMAIL] Successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


async def send_username_reminder(to_email: str, username: str) -> bool:
    """
    Send username reminder email.
    """
    subject = "UroLog - Kullanıcı Adınız"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .header h1 {{ color: #1e3a5f; margin: 0; }}
            .content {{ color: #333; line-height: 1.6; }}
            .username-box {{ background: #f0f7ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; font-size: 18px; }}
            .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏥 UroLog EMR</h1>
            </div>
            <div class="content">
                <p>Merhaba,</p>
                <p>Kullanıcı adınızı hatırlatmak için bu e-postayı gönderiyoruz:</p>
                <div class="username-box">
                    <strong>Kullanıcı Adınız:</strong> {username}
                </div>
                <p>Bu isteği siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
            </div>
            <div class="footer">
                <p>UroLog EMR Sistemi</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to_email, subject, html_content)


async def send_password_reset_email(
    to_email: str, reset_url: str, user_name: str
) -> bool:
    """
    Send password reset email with a secure link.

    Args:
        to_email: User's email address
        reset_url: Password reset URL with token
        user_name: User's full name for personalization
    """
    subject = "UroLog - Şifre Sıfırlama Talebi"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px 12px 0 0;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">UroLog</h1>
                                <p style="margin: 8px 0 0; color: #94b8d4; font-size: 14px;">Elektronik Sağlık Kayıt Sistemi</p>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 20px; color: #1e3a5f; font-size: 22px;">Merhaba {user_name or 'Kullanıcı'},</h2>

                                <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                    Hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.
                                </p>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="{reset_url}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.4);">
                                        Şifremi Sıfırla
                                    </a>
                                </div>

                                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>⚠️ Önemli:</strong> Bu link <strong>5 dakika</strong> içinde geçerliliğini yitirecektir.
                                    </p>
                                </div>

                                <p style="margin: 20px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                                    Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz. Hesabınız güvende kalacaktır.
                                </p>

                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">

                                <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                    Link çalışmıyorsa, aşağıdaki adresi tarayıcınıza yapıştırın:<br>
                                    <span style="color: #4a5568; word-break: break-all;">{reset_url}</span>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                    © 2026 UroLog EMR. Bu email otomatik olarak gönderilmiştir.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    return await send_email(to_email, subject, html_content)
