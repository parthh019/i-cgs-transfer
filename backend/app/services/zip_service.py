import io
import zipfile
from pathlib import Path
from typing import List

from app.services.storage_service import storage_service


class ZipService:
    """Creates ZIP archives of certificate PDFs for bulk download."""

    def create_event_zip(self, event_id: str, certificate_paths: List[str]) -> bytes:
        """
        Bundle all PDFs listed in *certificate_paths* into a ZIP archive.

        Parameters
        ----------
        event_id           : used only for the archive comment / metadata
        certificate_paths  : list of relative storage paths to certificate PDFs

        Returns
        -------
        bytes : raw ZIP archive bytes ready for streaming
        """
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
            zf.comment = f"Certificates for event {event_id}".encode()
            for rel_path in certificate_paths:
                if storage_service.file_exists(rel_path):
                    abs_path = storage_service.get_absolute_path(rel_path)
                    # Use just the filename inside the archive
                    arcname = Path(rel_path).name
                    zf.write(str(abs_path), arcname)
        buf.seek(0)
        return buf.read()


zip_service = ZipService()
