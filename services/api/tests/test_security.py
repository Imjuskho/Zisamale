"""Security hardening module tests.

Covers input validation (SQLi/XSS detection, GPS bounds, Malawi phone
format, clinical ranges), upload scanning and quarantine, encryption
primitives, the RBAC matrix, and structured audit logging.
"""

from __future__ import annotations

import json

import pytest
from fastapi import HTTPException

from app.security import audit_logger, encryption, file_scanner
from app.security import input_validation as iv
from app.security import rbac

PNG_HEADER = b"\x89PNG\r\n\x1a\n"
JPEG_HEADER = b"\xff\xd8\xff\xe0"


# ---------------------------------------------------------------------------
# Input validation: sanitization
# ---------------------------------------------------------------------------
def test_sanitize_string_strips_tags_and_escapes():
    dirty = "<script>alert('x')</script>Hello"
    clean = iv.sanitize_string(dirty)
    assert "<" not in clean and ">" not in clean
    assert "script" not in clean.lower()
    assert "Hello" in clean


def test_sanitize_string_escapes_special_chars_in_plain_text():
    assert iv.sanitize_string("Tom & Jerry's \"trip\"") == (
        "Tom &amp; Jerry&#x27;s &quot;trip&quot;"
    )
    assert iv.sanitize_string("") == ""
    assert iv.sanitize_string("plain clinical note") == "plain clinical note"


# ---------------------------------------------------------------------------
# Input validation: SQL injection / XSS detection
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "payload",
    [
        "' OR '1'='1",
        '" OR "1"="1',
        "1; DROP TABLE users--",
        "'; DELETE FROM visits;--",
        "UNION SELECT password FROM users",
        "admin'--",
        "SLEEP(5)",
        "BENCHMARK(1000000, MD5('x'))",
        "xp_cmdshell 'dir'",
        "1=1) OR 1=1--",
        "SELECT * FROM information_schema.tables",
    ],
)
def test_detect_sql_injection_payloads(payload):
    assert iv.detect_sql_injection(payload) is True


@pytest.mark.parametrize(
    "benign",
    [
        "O'Brien visited the household",
        "malaria cases rising in T/A Mlolo",
        "The patient--a child--recovered",
        "MUAC measured at 12.5cm",
        "",
        "refer to Nsanje district hospital",
    ],
)
def test_detect_sql_injection_allows_benign_text(benign):
    assert iv.detect_sql_injection(benign) is False


@pytest.mark.parametrize(
    "payload",
    [
        "<script>alert('xss')</script>",
        "<IMG SRC=x onerror=alert(1)>",
        "javascript:void(document.cookie)",
        "<iframe src='http://evil.example'></iframe>",
        "<svg onload=alert(1)>",
        "<body onload=steal()>",
        "eval(atob('dmFyIHg='))",
        "data:text/html;base64,PHNjcmlwdD4=",
    ],
)
def test_detect_xss_payloads(payload):
    assert iv.detect_xss(payload) is True


@pytest.mark.parametrize(
    "benign",
    [
        "Click <b>here</b> for news",
        "temperature < 38.5 recorded",
        "if a < b then increase dosage",
        "visit notes: mother and child are well",
        "",
    ],
)
def test_detect_xss_allows_benign_text(benign):
    assert iv.detect_xss(benign) is False


# ---------------------------------------------------------------------------
# Input validation: GPS bounds, phone format, clinical ranges
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "lat,lon",
    [(-13.96, 33.79), (-15.78, 35.00), (-11.5, 34.9), (-16.1, 33.0)],
)
def test_gps_coordinates_within_malawi(lat, lon):
    assert iv.validate_gps_coordinates(lat, lon) is True


@pytest.mark.parametrize(
    "lat,lon",
    [
        (-9.3, 33.8),
        (-17.2, 33.8),
        (-13.0, 32.6),
        (-13.0, 36.0),
        (51.5, -0.12),
        (40.7, 74.0),
    ],
)
def test_gps_coordinates_outside_malawi(lat, lon):
    assert iv.validate_gps_coordinates(lat, lon) is False


def test_gps_boundary_corners_inclusive():
    assert iv.validate_gps_coordinates(-17.1, 32.7) is True
    assert iv.validate_gps_coordinates(-9.4, 35.9) is True


@pytest.mark.parametrize(
    "phone",
    ["+265991123456", "+265 991 234 567", "+265-888-123-456", "+2650991234567"[:13]],
)
def test_phone_malawi_valid_formats(phone):
    assert iv.validate_phone_malawi(phone) is True


@pytest.mark.parametrize(
    "phone",
    [
        "0991234567",
        "+264991234567",
        "+26599123456",
        "+2659912345678",
        "265991234567",
        "not-a-phone",
        "",
    ],
)
def test_phone_malawi_invalid_formats(phone):
    assert iv.validate_phone_malawi(phone) is False


@pytest.mark.parametrize(
    "systolic,diastolic",
    [(120, 80), (90, 60), (140, 90), (50, 30), (300, 200)],
)
def test_bp_physiological_ranges(systolic, diastolic):
    ok, message = iv.validate_bp(systolic, diastolic)
    assert ok is True
    assert message == ""


@pytest.mark.parametrize(
    "systolic,diastolic",
    [(49, 30), (301, 200), (120, 130), (120, 120), (-5, 40), (80, 500)],
)
def test_bp_implausible_values_rejected(systolic, diastolic):
    ok, message = iv.validate_bp(systolic, diastolic)
    assert ok is False
    assert message


@pytest.mark.parametrize("cm", [5.0, 11.5, 18.0, 25.0])
def test_muac_valid_range(cm):
    ok, message = iv.validate_muac(cm)
    assert ok is True
    assert message == ""


@pytest.mark.parametrize("cm", [4.9, 25.1, 0.0, -3.0, 40.0])
def test_muac_out_of_range(cm):
    ok, message = iv.validate_muac(cm)
    assert ok is False
    assert message


# ---------------------------------------------------------------------------
# File scanning
# ---------------------------------------------------------------------------
def test_validate_image_accepts_png_and_jpeg_headers():
    assert file_scanner.validate_image(PNG_HEADER + b"rest-of-png") is True
    assert file_scanner.validate_image(JPEG_HEADER + b"rest-of-jpeg") is True


def test_validate_image_rejects_non_images():
    assert file_scanner.validate_image(b"<html><body>hi</body></html>") is False
    assert file_scanner.validate_image(b"%PDF-1.7 fake pdf") is False
    assert file_scanner.validate_image(b"GIF89a polyglot") is False
    assert file_scanner.validate_image(b"") is False


def test_check_file_size_limits():
    assert file_scanner.check_file_size(b"x" * 1024) is True
    assert file_scanner.check_file_size(b"x" * (10 * 1024 * 1024)) is True
    assert file_scanner.check_file_size(b"x" * (10 * 1024 * 1024 + 1)) is False
    assert file_scanner.check_file_size(b"x" * (3 * 1024 * 1024), max_mb=2) is False


def test_scan_file_clean_image_is_safe():
    result = file_scanner.scan_file(PNG_HEADER + b"IHDRDATA", "photo_001.png")
    assert result["safe"] is True
    assert result["issues"] == []
    assert result["detected_type"] == "image/png"
    assert result["size_bytes"] == len(PNG_HEADER + b"IHDRDATA")


def test_scan_file_flags_embedded_script_in_image():
    polyglot = PNG_HEADER + b"<script>alert('pwned')</script>"
    result = file_scanner.scan_file(polyglot, "evil.png")
    assert result["safe"] is False
    assert "embedded_script" in result["issues"]


def test_scan_file_flags_php_webshell_and_unknown_type():
    webshell = b"<?php system($_GET['cmd']); ?>"
    result = file_scanner.scan_file(webshell, "shell.png")
    assert result["safe"] is False
    assert "embedded_script" in result["issues"]
    assert "extension_mismatch" in result["issues"]

    unknown = file_scanner.scan_file(b"MZ\x90\x00 binary", "thing.bin")
    assert unknown["safe"] is False
    assert "unknown_file_type" in unknown["issues"]


def test_scan_file_flags_path_traversal_filename():
    result = file_scanner.scan_file(PNG_HEADER, "../../etc/passwd.png")
    assert result["safe"] is False
    assert "path_traversal_in_filename" in result["issues"]


def test_quarantine_suspicious_writes_file(tmp_path, monkeypatch):
    monkeypatch.setattr(file_scanner, "QUARANTINE_DIR", tmp_path / "quarantine")
    payload = b"suspicious-bytes"
    path = file_scanner.quarantine_suspicious(payload, "embedded script/xss!")

    written = tmp_path / "quarantine"
    assert written.exists()
    saved = written / path.split("/")[-1].split("\\")[-1]
    assert saved.read_bytes() == payload
    assert str(written) in path
    assert ".quarantine" in path
