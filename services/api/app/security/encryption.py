"""Cryptographic utilities: bcrypt password hashing, API keys, AES-256-GCM.

AES-256-GCM wire format: ``nonce (12 bytes) || ciphertext || tag (16 bytes)``.
Decryption failures (tampered ciphertext, wrong key) raise ``ValueError``
rather than leaking cryptography-internal exception types.
"""

from __future__ import annotations

import hashlib
import secrets

import bcrypt
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

NONCE_BYTES = 12
KEY_BYTES = 32


def hash_password_bcrypt(password: str) -> str:
    """Hash a password with bcrypt and a per-hash random salt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode(
        "utf-8"
    )


def verify_password_bcrypt(password: str, hashed: str) -> bool:
    """Constant-time bcrypt verification; malformed hashes verify as False."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def generate_api_key() -> str:
    """Generate a URL-safe API key carrying 32 bytes of entropy."""
    return secrets.token_urlsafe(32)


def hash_data_sha256(data: bytes) -> str:
    """SHA-256 hex digest of arbitrary bytes (file checksums, dedup keys)."""
    return hashlib.sha256(data).hexdigest()


def encrypt_aes_gcm(plaintext: bytes, key: bytes) -> bytes:
    """Encrypt with AES-256-GCM; returns nonce || ciphertext || tag."""
    if len(key) != KEY_BYTES:
        raise ValueError(f"AES-256-GCM requires a {KEY_BYTES}-byte key")
    nonce = secrets.token_bytes(NONCE_BYTES)
    return nonce + AESGCM(key).encrypt(nonce, plaintext, None)


def decrypt_aes_gcm(ciphertext: bytes, key: bytes) -> bytes:
    """Decrypt an AES-256-GCM payload produced by :func:`encrypt_aes_gcm`."""
    if len(key) != KEY_BYTES:
        raise ValueError(f"AES-256-GCM requires a {KEY_BYTES}-byte key")
    if len(ciphertext) < NONCE_BYTES + 16:
        raise ValueError("Ciphertext too short to contain nonce and tag")
    nonce, body = ciphertext[:NONCE_BYTES], ciphertext[NONCE_BYTES:]
    try:
        return AESGCM(key).decrypt(nonce, body, None)
    except InvalidTag as exc:
        raise ValueError("Decryption failed: authentication tag mismatch") from exc
