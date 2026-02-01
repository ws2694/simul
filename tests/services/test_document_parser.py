"""Tests for document parser."""
import pytest
from src.services.document_parser import parse_document


class TestParseDocument:
    def test_parse_txt_utf8(self):
        """Test parsing a basic UTF-8 text file."""
        content = "Hello, this is a design document.\nIt has multiple lines."
        result = parse_document(content.encode("utf-8"), "txt")
        assert "Hello, this is a design document." in result
        assert "It has multiple lines." in result

    def test_parse_txt_with_dot_prefix(self):
        """Test parsing txt with dot-prefixed extension."""
        content = "Test content"
        result = parse_document(content.encode("utf-8"), ".txt")
        assert result == "Test content"

    def test_parse_pdf_single_page(self):
        """Test parsing a single-page PDF."""
        from PyPDF2 import PdfWriter
        import io

        writer = PdfWriter()
        writer.add_blank_page(width=612, height=792)
        # PyPDF2 blank pages won't have text, but we test the flow
        buf = io.BytesIO()
        writer.write(buf)
        pdf_bytes = buf.getvalue()

        result = parse_document(pdf_bytes, "pdf")
        # Blank page won't have text, so result may be empty
        assert isinstance(result, str)

    def test_parse_unsupported_format_raises(self):
        """Test that unsupported formats raise ValueError."""
        with pytest.raises(ValueError, match="Unsupported document format"):
            parse_document(b"data", "xlsx")

    def test_parse_unsupported_format_pptx(self):
        """Test that pptx raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported document format"):
            parse_document(b"data", "pptx")

    def test_parse_empty_txt_document(self):
        """Test parsing an empty text document."""
        result = parse_document(b"", "txt")
        assert result == ""

    def test_parse_empty_whitespace_document(self):
        """Test parsing a whitespace-only text document."""
        result = parse_document(b"   \n  \t  ", "txt")
        assert result == ""

    def test_parse_txt_unicode(self):
        """Test parsing text with unicode characters."""
        content = "Unicode test: \u00e9\u00e8\u00ea \u00fc\u00f6\u00e4 \u4e16\u754c"
        result = parse_document(content.encode("utf-8"), "txt")
        assert "\u00e9\u00e8\u00ea" in result
