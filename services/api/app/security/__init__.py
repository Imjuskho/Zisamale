"""Security hardening module.

Submodules:
    input_validation - OWASP input validation and clinical range checks
    file_scanner     - upload scanning, magic-byte checks, quarantine
    encryption       - bcrypt password hashing, API keys, AES-256-GCM
    rbac             - role-based access control matrix
    audit_logger     - structured JSON security logging to stdout
"""

from app.security.audit_logger import (
    log_api_call,
    log_auth_event,
    log_data_access,
    log_security_event,
)
from app.security.encryption import (
    decrypt_aes_gcm,
    encrypt_aes_gcm,
    generate_api_key,
    hash_data_sha256,
    hash_password_bcrypt,
    verify_password_bcrypt,
)
from app.security.file_scanner import (
    check_file_size,
    quarantine_suspicious,
    scan_file,
    validate_image,
)
from app.security.input_validation import (
    detect_sql_injection,
    detect_xss,
    sanitize_string,
    validate_bp,
    validate_gps_coordinates,
    validate_muac,
    validate_phone_malawi,
)
from app.security.rbac import RBAC_MATRIX, check_permission, require_permission

__all__ = [
    "RBAC_MATRIX",
    "check_file_size",
    "check_permission",
    "decrypt_aes_gcm",
    "detect_sql_injection",
    "detect_xss",
    "encrypt_aes_gcm",
    "generate_api_key",
    "hash_data_sha256",
    "hash_password_bcrypt",
    "log_api_call",
    "log_auth_event",
    "log_data_access",
    "log_security_event",
    "quarantine_suspicious",
    "require_permission",
    "sanitize_string",
    "scan_file",
    "validate_bp",
    "validate_gps_coordinates",
    "validate_image",
    "validate_muac",
    "validate_phone_malawi",
    "verify_password_bcrypt",
]
