import logging
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


class EmailService:
    """Sends certificate emails with PDF attachments via SMTP."""

    async def send_certificate_email(
        self,
        to_email: str,
        attendee_name: str,
        course_name: str,
        certificate_id: str,
        pdf_path: str,
    ) -> bool:
        """
        Send a certificate email with the PDF attached.

        Returns True on success, False if email is disabled.
        Raises on SMTP / config errors.
        """
        if not settings.EMAIL_ENABLED:
            logger.warning(
                "Email is disabled (EMAIL_ENABLED=False). Skipping send to %s.", to_email
            )
            return False

        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            raise ValueError("SMTP credentials (SMTP_USER / SMTP_PASSWORD) are not configured.")

        msg = MIMEMultipart("mixed")
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = f"Your Certificate – {course_name}"

        # ── HTML body ────────────────────────────────────────────────────
        html_body = f"""
        <html>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
            <tr>
              <td align="center" style="padding:40px 0;">
                <table width="600" cellpadding="0" cellspacing="0"
                       style="background:#ffffff;border-radius:8px;overflow:hidden;
                              box-shadow:0 2px 8px rgba(0,0,0,.1);">
                  <tr>
                    <td style="background:#4F46E5;padding:30px 40px;">
                      <h1 style="color:#ffffff;margin:0;font-size:22px;">
                        🎓 Congratulations, {attendee_name}!
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 40px;">
                      <p style="color:#374151;font-size:15px;line-height:1.6;">
                        We are pleased to share your certificate for
                        <strong>{course_name}</strong>.
                        Please find it attached to this email.
                      </p>
                      <p style="color:#374151;font-size:15px;">
                        <strong>Certificate ID:</strong> {certificate_id}
                      </p>
                      <p style="color:#374151;font-size:15px;">
                        You can verify the authenticity of your certificate at any time
                        by scanning the QR code printed on it or by visiting our
                        verification portal.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 40px 30px;border-top:1px solid #E5E7EB;">
                      <p style="color:#9CA3AF;font-size:13px;margin:0;">
                        Best regards,<br>
                        <strong>{settings.EMAIL_FROM_NAME}</strong>
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
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # ── PDF attachment ───────────────────────────────────────────────
        if pdf_path and storage_service.file_exists(pdf_path):
            pdf_bytes = storage_service.read_file_sync(pdf_path)
            part = MIMEBase("application", "pdf")
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            safe_cert_id = certificate_id.replace("/", "_").replace("\\", "_")
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{safe_cert_id}.pdf"',
            )
            msg.attach(part)
        else:
            logger.warning("PDF not found at path '%s' — sending without attachment.", pdf_path)

        # ── SMTP send ────────────────────────────────────────────────────
        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            logger.info("Email sent to %s (cert %s).", to_email, certificate_id)
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to_email, exc)
            raise

    async def send_custom_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        pdf_bytes: bytes,
        pdf_filename: str,
    ) -> bool:
        """
        Send a custom email with PDF bytes attached via SMTP.
        """
        if not settings.EMAIL_ENABLED:
            logger.warning(
                "Email is disabled (EMAIL_ENABLED=False). Skipping send to %s.", to_email
            )
            return False

        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            raise ValueError("SMTP credentials (SMTP_USER / SMTP_PASSWORD) are not configured.")

        msg = MIMEMultipart("mixed")
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        # Attach text body
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        # Attach PDF file bytes
        part = MIMEBase("application", "pdf")
        part.set_payload(pdf_bytes)
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f'attachment; filename="{pdf_filename}"',
        )
        msg.attach(part)

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            logger.info("Custom email sent to %s with attachment %s.", to_email, pdf_filename)
            return True
        except Exception as exc:
            logger.error("Failed to send custom email to %s: %s", to_email, exc)
            raise


email_service = EmailService()

