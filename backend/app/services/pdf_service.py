import io
import logging
import uuid as _uuid
from pathlib import Path
from typing import Optional

from PIL import Image as PILImage
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.services.qr_service import qr_service
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)


class PDFService:
    """
    Generates certificate PDFs by compositing placeholder text (and a QR code)
    over a template image (PNG/JPG) or PDF.
    """

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def generate_certificate(
        self,
        template_relative_path: str,
        file_type: str,
        placeholder_config: dict,
        certificate_data: dict,
        event_id: str,
        certificate_id: str,
        generate_qr: bool = True,
    ) -> str:
        """
        Generate a certificate PDF.

        Parameters
        ----------
        template_relative_path : relative path to the template file in storage
        file_type              : "png", "jpg", "jpeg", or "pdf"
        placeholder_config     : dict matching PlaceholderConfig schema
        certificate_data       : {
            "candidate_name", "certificate_id", "date",
            "course_name", "organization_name"
        }
        event_id               : UUID string — used to bucket output files
        certificate_id         : certificate ID string — used as filename
        generate_qr            : whether to embed a QR code

        Returns
        -------
        str : relative storage path of the generated PDF
        """
        template_abs = storage_service.get_absolute_path(template_relative_path)

        qr_path: Optional[str] = None
        if generate_qr:
            try:
                qr_path = qr_service.save_qr_code(certificate_id)
            except Exception as exc:
                logger.warning("QR generation failed for %s: %s", certificate_id, exc)

        ft = file_type.lower().lstrip(".")
        if ft in ("png", "jpg", "jpeg"):
            return self._generate_from_image(
                template_abs, ft, placeholder_config,
                certificate_data, event_id, certificate_id, qr_path,
            )
        elif ft == "pdf":
            return self._generate_from_pdf(
                template_abs, placeholder_config,
                certificate_data, event_id, certificate_id, qr_path,
            )
        else:
            raise ValueError(f"Unsupported template file type: {file_type}")

    def generate_preview(
        self,
        template_relative_path: str,
        file_type: str,
        placeholder_config: dict,
        sample_data: dict,
    ) -> bytes:
        """
        Generate a preview certificate and return it as PNG bytes.
        A temporary PDF is created then converted (or returned as-is if
        pdf2image is unavailable).
        """
        temp_cert_id = f"preview-{_uuid.uuid4().hex}"
        temp_event_id = "preview"

        rel_path = self.generate_certificate(
            template_relative_path,
            file_type,
            placeholder_config,
            sample_data,
            temp_event_id,
            temp_cert_id,
            generate_qr=False,
        )

        pdf_abs = storage_service.get_absolute_path(rel_path)
        preview_bytes: bytes

        try:
            from pdf2image import convert_from_path  # type: ignore

            images = convert_from_path(
                str(pdf_abs), dpi=150, first_page=1, last_page=1
            )
            buf = io.BytesIO()
            images[0].save(buf, format="PNG")
            preview_bytes = buf.getvalue()
        except Exception:
            # Fallback: return the raw PDF bytes
            with open(str(pdf_abs), "rb") as f:
                preview_bytes = f.read()

        # Clean up temp files
        storage_service.delete_file(rel_path)

        return preview_bytes

    # ------------------------------------------------------------------ #
    #  Image-template path                                                 #
    # ------------------------------------------------------------------ #

    def _generate_from_image(
        self,
        template_path: Path,
        file_type: str,
        placeholder_config: dict,
        certificate_data: dict,
        event_id: str,
        certificate_id: str,
        qr_path: Optional[str],
    ) -> str:
        img = PILImage.open(template_path)
        img_width, img_height = img.size

        # Ensure RGB for JPEG encoding
        if img.mode != "RGB":
            img = img.convert("RGB")

        img_buf = io.BytesIO()
        img.save(img_buf, format="JPEG", quality=95)
        img_buf.seek(0)

        # PDF page dimensions in points (assume 96 DPI → points = px * 72/96)
        page_width = img_width * 72.0 / 96.0
        page_height = img_height * 72.0 / 96.0

        pdf_relative_path = storage_service.get_certificate_path(event_id, certificate_id)
        pdf_abs_path = storage_service.get_absolute_path(pdf_relative_path)
        pdf_abs_path.parent.mkdir(parents=True, exist_ok=True)

        c = canvas.Canvas(str(pdf_abs_path), pagesize=(page_width, page_height))

        # Background image
        img_reader = ImageReader(img_buf)
        c.drawImage(img_reader, 0, 0, width=page_width, height=page_height)

        # Text overlays
        self._draw_placeholders(
            c, placeholder_config, certificate_data,
            page_width, page_height, img_width, img_height,
        )

        # QR code overlay
        if qr_path and storage_service.file_exists(qr_path):
            self._draw_qr_code(c, qr_path, page_width, page_height)

        c.save()
        logger.info("Generated certificate: %s", pdf_relative_path)
        return pdf_relative_path

    # ------------------------------------------------------------------ #
    #  PDF-template path                                                   #
    # ------------------------------------------------------------------ #

    def _generate_from_pdf(
        self,
        template_path: Path,
        placeholder_config: dict,
        certificate_data: dict,
        event_id: str,
        certificate_id: str,
        qr_path: Optional[str],
    ) -> str:
        try:
            from pypdf import PdfReader, PdfWriter  # type: ignore

            reader = PdfReader(str(template_path))
            page = reader.pages[0]
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)

            pdf_relative_path = storage_service.get_certificate_path(event_id, certificate_id)
            pdf_abs_path = storage_service.get_absolute_path(pdf_relative_path)
            pdf_abs_path.parent.mkdir(parents=True, exist_ok=True)

            # Build text overlay
            overlay_buf = io.BytesIO()
            c = canvas.Canvas(overlay_buf, pagesize=(page_width, page_height))
            self._draw_placeholders(
                c, placeholder_config, certificate_data,
                page_width, page_height, page_width, page_height,
            )
            if qr_path and storage_service.file_exists(qr_path):
                self._draw_qr_code(c, qr_path, page_width, page_height)
            c.save()
            overlay_buf.seek(0)

            overlay_reader = PdfReader(overlay_buf)
            page.merge_page(overlay_reader.pages[0])

            writer = PdfWriter()
            writer.add_page(page)

            with open(str(pdf_abs_path), "wb") as f:
                writer.write(f)

            logger.info("Generated certificate (PDF template): %s", pdf_relative_path)
            return pdf_relative_path

        except ImportError:
            logger.warning(
                "pypdf not installed — falling back to image-based render for PDF template"
            )
            # Try to open the PDF as an image with Pillow (requires pillow-pdf or similar)
            return self._generate_from_image(
                template_path, "jpg", placeholder_config,
                certificate_data, event_id, certificate_id, qr_path,
            )

    # ------------------------------------------------------------------ #
    #  Drawing helpers                                                     #
    # ------------------------------------------------------------------ #

    def _draw_placeholders(
        self,
        c: canvas.Canvas,
        placeholder_config: dict,
        certificate_data: dict,
        page_width: float,
        page_height: float,
        img_width: float,
        img_height: float,
    ) -> None:
        """Overlay all enabled text fields onto *c*."""
        scale_x = page_width / img_width if img_width else 1.0
        scale_y = page_height / img_height if img_height else 1.0

        field_map = {
            "candidate_name": certificate_data.get("candidate_name", ""),
            "certificate_id": certificate_data.get("certificate_id", ""),
            "date": certificate_data.get("date", ""),
            "course_name": certificate_data.get("course_name", ""),
            "organization_name": certificate_data.get("organization_name", ""),
        }

        for field_key, text_value in field_map.items():
            config = placeholder_config.get(field_key)
            if not config:
                continue
            if not config.get("enabled", True):
                continue

            # Static override for organization_name
            if field_key == "organization_name":
                static_val = placeholder_config.get("organization_name_value")
                if static_val:
                    text_value = static_val

            if not text_value:
                continue

            x_pixel = float(config.get("x", 0))
            y_pixel = float(config.get("y", 0))
            font_size = int(config.get("font_size", 24))
            font_color = config.get("font_color", "#000000")
            alignment = config.get("alignment", "center")
            font_name = config.get("font_name", "Helvetica-Bold")

            # Convert pixel → PDF points; flip Y axis (PDF origin = bottom-left)
            x_pt = x_pixel * scale_x
            y_pt = page_height - (y_pixel * scale_y)

            try:
                c.setFont(font_name, font_size)
            except Exception:
                c.setFont("Helvetica-Bold", font_size)

            try:
                c.setFillColor(HexColor(font_color))
            except Exception:
                c.setFillColorRGB(0, 0, 0)

            text_str = str(text_value)
            if alignment == "center":
                c.drawCentredString(x_pt, y_pt, text_str)
            elif alignment == "right":
                c.drawRightString(x_pt, y_pt, text_str)
            else:
                c.drawString(x_pt, y_pt, text_str)

    def _draw_qr_code(
        self,
        c: canvas.Canvas,
        qr_path: str,
        page_width: float,
        page_height: float,
    ) -> None:
        """Draw the QR code in the bottom-right corner of the certificate."""
        qr_abs = storage_service.get_absolute_path(qr_path)
        if not qr_abs.exists():
            return
        qr_size = min(page_width, page_height) * 0.10  # 10 % of shorter side
        margin = 20.0
        x = page_width - qr_size - margin
        y = margin
        c.drawImage(str(qr_abs), x, y, width=qr_size, height=qr_size, mask="auto")


pdf_service = PDFService()
