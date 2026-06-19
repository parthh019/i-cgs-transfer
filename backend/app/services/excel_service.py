import io
import random
import re
import string
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd


class ExcelService:
    """
    Parses attendee data from uploaded Excel files, normalises column names,
    validates required fields, and auto-generates certificate IDs where absent.
    """

    REQUIRED_COLUMNS = ["name"]
    OPTIONAL_COLUMNS = ["email", "certificate_id", "course_name", "date"]

    # Maps canonical column names → list of accepted aliases (all lower-case)
    COLUMN_ALIASES: Dict[str, List[str]] = {
        "name": ["name", "full_name", "attendee_name", "candidate_name", "participant_name"],
        "email": ["email", "email_address", "attendee_email", "e-mail", "e_mail"],
        "certificate_id": ["certificate_id", "cert_id", "id", "certificate_number"],
        "course_name": ["course_name", "course", "program", "program_name", "workshop"],
        "date": ["date", "issue_date", "certificate_date", "completion_date"],
    }

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def parse_excel(
        self,
        file_bytes: bytes,
        event_name: str = "",
        event_date: Optional[date] = None,
    ) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
        """
        Parse an Excel file and return ``(records, columns_found, errors)``.

        records       : list of dicts with normalised keys ready to insert into DB
        columns_found : list of column names discovered in the sheet
        errors        : non-fatal row-level errors (processing continues)
        """
        # Read file
        try:
            df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
        except Exception as exc:
            return [], [], [f"Failed to read Excel file: {exc}"]

        if df.empty:
            return [], [], ["Excel file is empty or has no data rows."]

        # Normalise column headers
        df.columns = [
            str(col).strip().lower().replace(" ", "_").replace("-", "_")
            for col in df.columns
        ]

        # Resolve aliases → canonical names
        col_map: Dict[str, str] = {}
        for canonical, aliases in self.COLUMN_ALIASES.items():
            for col in df.columns:
                if col in aliases and canonical not in col_map.values():
                    col_map[col] = canonical
                    break

        df = df.rename(columns=col_map)
        columns_found = list(df.columns)

        # Validate required columns exist
        errors: List[str] = []
        for req in self.REQUIRED_COLUMNS:
            if req not in df.columns:
                errors.append(
                    f"Required column '{req}' not found. "
                    f"Columns found: {columns_found}. "
                    f"Accepted aliases: {self.COLUMN_ALIASES[req]}"
                )
                return [], columns_found, errors

        records: List[Dict[str, Any]] = []

        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # Excel row number (1-indexed header + 1)

            # ── Name ──────────────────────────────────────────────────────
            name = self._clean_str(row.get("name"))
            if not name:
                errors.append(f"Row {row_num}: Name is empty — row skipped.")
                continue

            # ── Email ─────────────────────────────────────────────────────
            email = self._clean_str(row.get("email")) if "email" in df.columns else None
            if email:
                if not re.match(r"^[\w.\-+]+@[\w\-]+\.[\w.\-]+$", email):
                    errors.append(f"Row {row_num}: Invalid email '{email}' — ignored.")
                    email = None

            # ── Certificate ID ────────────────────────────────────────────
            cert_id = self._clean_str(row.get("certificate_id")) if "certificate_id" in df.columns else None
            if not cert_id:
                cert_id = self._generate_cert_id()

            # ── Course name ───────────────────────────────────────────────
            course = self._clean_str(row.get("course_name")) if "course_name" in df.columns else None
            if not course:
                course = event_name or "Training Program"

            # ── Issue date ────────────────────────────────────────────────
            issue_date = self._parse_date(row.get("date") if "date" in df.columns else None)
            if issue_date is None:
                issue_date = event_date or date.today()

            records.append(
                {
                    "attendee_name": name,
                    "attendee_email": email,
                    "certificate_id": cert_id,
                    "course_name": course,
                    "issue_date": issue_date,
                }
            )

        return records, columns_found, errors

    # ------------------------------------------------------------------ #
    #  Private helpers                                                     #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _clean_str(value: Any) -> Optional[str]:
        """Strip a cell value; return None for NaN/empty."""
        if value is None:
            return None
        s = str(value).strip()
        if s.lower() in ("nan", "none", ""):
            return None
        return s

    @staticmethod
    def _generate_cert_id() -> str:
        """Auto-generate a unique certificate ID."""
        from datetime import datetime

        rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"CERT-{datetime.now().strftime('%Y%m%d')}-{rand}"

    @staticmethod
    def _parse_date(value: Any) -> Optional[date]:
        """Try to coerce a cell value to a Python date."""
        if value is None:
            return None
        s = str(value).strip()
        if s.lower() in ("nan", "none", ""):
            return None
        try:
            if isinstance(value, pd.Timestamp):
                return value.date()
            if isinstance(value, date):
                return value
            return pd.to_datetime(s).date()
        except Exception:
            return None


excel_service = ExcelService()
