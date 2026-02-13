"""File upload service for payables and cashflow attachments."""

import os
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile

from ..config import MAX_UPLOAD_SIZE_MB

PAYABLE_ALLOWED_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

PAYABLE_ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.docx'}

CASHFLOW_ALLOWED_TYPES = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

CASHFLOW_ALLOWED_EXTENSIONS = {'.xlsx'}


async def save_upload(
    file: UploadFile,
    upload_dir: Path,
    allowed_extensions: set,
) -> tuple[str, str]:
    """
    Save an uploaded file with a UUID filename.
    Returns (saved_path, original_filename).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Check extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    # Check file size
    content = await file.read()
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {MAX_UPLOAD_SIZE_MB}MB limit"
        )

    # Save with UUID filename
    saved_name = f"{uuid.uuid4()}{ext}"
    saved_path = upload_dir / saved_name
    with open(saved_path, "wb") as f:
        f.write(content)

    return str(saved_path), file.filename


def delete_upload(file_path: str) -> None:
    """Delete an uploaded file if it exists."""
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
