"""OWASP-aligned input validation for Zisamale API payloads.

Pure functions with no I/O so they can be composed inside pydantic
validators, routers, or services. Detection helpers are intentionally
conservative: they flag likely attacks for rejection/quarantine upstream,
while benign text (names such as "O'Brien", clinical notes) passes through.
"""

from __future__ import annotations

import html
import re

MALAWI_LAT_BOUNDS = (-17.1, -9.4)
MALAWI_LON_BOUNDS = (32.7, 35.9)

_PHONE_RE = re.compile(r"^\+265\d{9}$")
_PHONE_STRIP_RE = re.compile(r"[\s\-().]")
_TAG_RE = re.compile(r"<[^>]*>")

_SQLI_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"['\"].*?\bor\b.*?['\"].*?=.*?['\"]",  # ' OR '1'='1
        r"\bunion[\s\S]*?\bselect\b",
        r";\s*(?:drop|delete|insert|update|alter|truncate|create|exec)\b",
        r"\b(?:drop|truncate|alter)\s+table\b",
        r"\bdelete\s+from\b",
        r"\binsert\s+into\b",
        r"--(?:\s|$)",
        r"/\*[\s\S]*?\*/",
        r"\bxp_cmdshell\b",
        r"\b(?:sleep|benchmark|waitfor|pg_sleep|dbms_lock)\s*\(",
        r"\bor\s+\d+\s*=\s*\d+\b",
        r"\binformation_schema\b",
        r"\bload_file\s*\(",
        r"\binto\s+(?:out|dump)file\b",
    )
)

_XSS_PATTERNS = tuple(
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"<\s*script\b",
        r"<\s*/\s*script",
        r"javascript\s*:",
        r"vbscript\s*:",
        r"\bon(?:load|error|click|mouseover|mouseout|focus|blur|submit|abort|change"
        r"|dblclick|keydown|keypress|keyup|mousedown|mousemove|mouseup|reset|select"
        r"|unload|drag|drop|play|toggle|animationstart)\s*=",
        r"<\s*(?:iframe|object|embed|svg|img|body|form|input|link|meta|base|video"
        r"|audio|marquee|details)\b",
        r"\bdocument\s*\.\s*(?:cookie|location|write|domain)",
        r"\beval\s*\(",
        r"\bexpression\s*\(",
        r"\bsrcdoc\s*=",
        r"data\s*:\s*text/html",
        r"\bfromcharcode\s*\(",
    )
)


def sanitize_string(value: str) -> str:
    """Strip HTML tags and escape remaining special characters."""
    if not isinstance(value, str):
        return ""
    without_tags = _TAG_RE.sub("", value)
    return html.escape(without_tags, quote=True)


def validate_gps_coordinates(lat: float, lon: float) -> bool:
    """True when the coordinate falls within Malawi's bounds."""
    lat_ok = MALAWI_LAT_BOUNDS[0] <= lat <= MALAWI_LAT_BOUNDS[1]
    lon_ok = MALAWI_LON_BOUNDS[0] <= lon <= MALAWI_LON_BOUNDS[1]
    return lat_ok and lon_ok


def validate_phone_malawi(phone: str) -> bool:
    """True for Malawi numbers in +265XXXXXXXXX format (spaces/dashes tolerated)."""
    if not isinstance(phone, str):
        return False
    normalized = _PHONE_STRIP_RE.sub("", phone.strip())
    return bool(_PHONE_RE.match(normalized))


def validate_bp(systolic: int, diastolic: int) -> tuple[bool, str]:
    """Physiological plausibility check for a blood-pressure reading."""
    if not isinstance(systolic, (int, float)) or not isinstance(diastolic, (int, float)):
        return False, "Blood pressure values must be numeric"
    if not 50 <= systolic <= 300:
        return False, f"Systolic {systolic} outside physiological range (50-300 mmHg)"
    if not 20 <= diastolic <= 250:
        return False, f"Diastolic {diastolic} outside physiological range (20-250 mmHg)"
    if diastolic >= systolic:
        return False, (f"Diastolic ({diastolic}) must be lower than systolic ({systolic})")
    return True, ""


def validate_muac(cm: float) -> tuple[bool, str]:
    """Mid-upper arm circumference must fall in the measurable 5-25 cm band."""
    if not isinstance(cm, (int, float)):
        return False, "MUAC must be numeric"
    if not 5.0 <= cm <= 25.0:
        return False, f"MUAC {cm}cm outside valid range (5-25 cm)"
    return True, ""


def detect_sql_injection(value: str) -> bool:
    """True when the string matches known SQL injection patterns."""
    if not value:
        return False
    candidate = str(value)
    return any(pattern.search(candidate) for pattern in _SQLI_PATTERNS)


def detect_xss(value: str) -> bool:
    """True when the string matches known cross-site scripting patterns."""
    if not value:
        return False
    candidate = str(value)
    return any(pattern.search(candidate) for pattern in _XSS_PATTERNS)
