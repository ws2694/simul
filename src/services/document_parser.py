"""Document parser for extracting text from PDF, DOCX, and TXT files."""
import structlog

logger = structlog.get_logger()


def parse_document(file_bytes: bytes, extension: str) -> str:
    """Parse a document file and return its text content.

    Args:
        file_bytes: Raw bytes of the document file.
        extension: File extension (e.g., "pdf", "docx", "txt").

    Returns:
        Extracted text content.

    Raises:
        ValueError: If the file format is unsupported or empty.
    """
    ext = extension.lower().lstrip(".")

    if ext == "txt":
        return _parse_txt(file_bytes)
    elif ext == "pdf":
        return _parse_pdf(file_bytes)
    elif ext == "docx":
        return _parse_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported document format: .{ext}")


def _parse_txt(file_bytes: bytes) -> str:
    """Parse plain text file."""
    text = file_bytes.decode("utf-8")
    if not text.strip():
        return ""
    return text


def _parse_pdf(file_bytes: bytes) -> str:
    """Parse PDF file using PyPDF2."""
    import io

    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if page_text:
            pages.append(f"--- Page {i + 1} ---\n{page_text}")

    return "\n\n".join(pages)


def _parse_docx(file_bytes: bytes) -> str:
    """Parse DOCX file using python-docx."""
    import io

    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = []
    for para in doc.paragraphs:
        if para.text.strip():
            paragraphs.append(para.text)

    return "\n\n".join(paragraphs)
