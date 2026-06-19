import shutil
from pathlib import Path

import aiofiles

from app.core.config import settings


class StorageService:
    """
    Abstraction layer over the local filesystem for storing certificates,
    QR codes, and template files.  Designed to be swappable with an S3
    backend in the future.
    """

    def __init__(self) -> None:
        self.base_path = Path(settings.STORAGE_BASE_PATH)

    # ------------------------------------------------------------------ #
    #  Path helpers                                                        #
    # ------------------------------------------------------------------ #

    def get_certificate_path(self, event_id: str, certificate_id: str) -> str:
        """Return the relative path for a certificate PDF."""
        return f"certificates/{event_id}/{certificate_id}.pdf"

    def get_qrcode_path(self, certificate_id: str) -> str:
        """Return the relative path for a QR-code PNG."""
        return f"qrcodes/{certificate_id}.png"

    def get_template_path(self, filename: str) -> str:
        """Return the relative path for a template image/PDF."""
        return f"templates/{filename}"

    def get_absolute_path(self, relative_path: str) -> Path:
        """Convert a relative storage path to an absolute filesystem path."""
        return self.base_path / relative_path

    # ------------------------------------------------------------------ #
    #  Directory helpers                                                   #
    # ------------------------------------------------------------------ #

    def ensure_dir(self, relative_path: str) -> None:
        """Create directory (and parents) if it does not exist."""
        abs_path = self.get_absolute_path(relative_path)
        abs_path.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------ #
    #  Async I/O                                                           #
    # ------------------------------------------------------------------ #

    async def save_file(self, relative_path: str, content: bytes) -> None:
        """Asynchronously write bytes to a storage path, creating parent dirs."""
        abs_path = self.get_absolute_path(relative_path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(abs_path, "wb") as f:
            await f.write(content)

    async def read_file(self, relative_path: str) -> bytes:
        """Asynchronously read bytes from a storage path."""
        abs_path = self.get_absolute_path(relative_path)
        async with aiofiles.open(abs_path, "rb") as f:
            return await f.read()

    # ------------------------------------------------------------------ #
    #  Sync I/O (used by PDF / QR services that are CPU-bound)            #
    # ------------------------------------------------------------------ #

    def save_file_sync(self, relative_path: str, content: bytes) -> None:
        """Synchronously write bytes to a storage path, creating parent dirs."""
        abs_path = self.get_absolute_path(relative_path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        with open(abs_path, "wb") as f:
            f.write(content)

    def read_file_sync(self, relative_path: str) -> bytes:
        """Synchronously read bytes from a storage path."""
        abs_path = self.get_absolute_path(relative_path)
        with open(abs_path, "rb") as f:
            return f.read()

    # ------------------------------------------------------------------ #
    #  File management                                                     #
    # ------------------------------------------------------------------ #

    def file_exists(self, relative_path: str) -> bool:
        """Return True if the file exists in storage."""
        return self.get_absolute_path(relative_path).exists()

    def delete_file(self, relative_path: str) -> None:
        """Delete a single file from storage (no-op if not found)."""
        abs_path = self.get_absolute_path(relative_path)
        if abs_path.exists():
            abs_path.unlink()

    def delete_directory(self, relative_path: str) -> None:
        """Recursively delete a directory from storage (no-op if not found)."""
        abs_path = self.get_absolute_path(relative_path)
        if abs_path.exists():
            shutil.rmtree(abs_path)


storage_service = StorageService()
