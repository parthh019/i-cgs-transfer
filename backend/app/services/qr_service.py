import io

import qrcode
import qrcode.constants

from app.core.config import settings
from app.services.storage_service import storage_service


class QRService:
    """Generates and stores QR-code images for certificate verification URLs."""

    def generate_qr_code(self, certificate_id: str) -> bytes:
        """
        Generate a QR-code PNG that encodes the public verification URL for the
        given certificate_id.  Returns raw PNG bytes.
        """
        verification_url = f"{settings.FRONTEND_URL}/verify/{certificate_id}"
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(verification_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    def save_qr_code(self, certificate_id: str) -> str:
        """
        Generate a QR-code for *certificate_id*, persist it to storage, and
        return the relative storage path.
        """
        qr_bytes = self.generate_qr_code(certificate_id)
        relative_path = storage_service.get_qrcode_path(certificate_id)
        storage_service.save_file_sync(relative_path, qr_bytes)
        return relative_path


qr_service = QRService()
