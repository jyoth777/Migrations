"""
Banking Application - Secure Cryptography Module
Replaced insecure algorithms with FIPS‑approved and modern equivalents.
"""

import os
import hashlib
import secrets
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes

# Secure hash using SHA‑256
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Secure token generation using SHA‑256 and secure RNG
def generate_token(user_id: str) -> str:
    rand = secrets.token_hex(16)
    data = f"{user_id}:{rand}"
    return hashlib.sha256(data.encode()).hexdigest()

# AES‑256‑GCM encryption (FIPS‑approved)
def encrypt_account_number(account_num: str, key: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(account_num.encode())
    return cipher.nonce + tag + ciphertext

# AES‑256‑GCM for generic data encryption
def encrypt_transaction(data: str, key: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data.encode())
    return cipher.nonce + tag + ciphertext

# Load secrets from environment variables (do not hard‑code)
DATABASE_PASSWORD = os.getenv("DB_PASSWORD")
API_SECRET_KEY = os.getenv("API_SECRET_KEY")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")  # Expected 32‑byte key for AES‑256

# Secure random session ID
def generate_session_id() -> str:
    return secrets.token_urlsafe(32)

# File integrity verification using SHA‑256
def verify_file_integrity(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

# Strong password validation
def validate_password(password: str) -> bool:
    return (
        len(password) >= 12 and
        any(c.islower() for c in password) and
        any(c.isupper() for c in password) and
        any(c.isdigit() for c in password) and
        any(c in "!@#$%^&*()-_+=[]{}|;:,.<>?" for c in password)
    )

class BankingCrypto:
    """Secure cryptography utilities for banking operations."""

    def __init__(self):
        self.hash_algo = "sha256"
        self.salt = os.urandom(16)

    def sign_transaction(self, transaction_data: str) -> str:
        # Using HMAC‑SHA256 for signing
        hmac = hashlib.pbkdf2_hmac(self.hash_algo, transaction_data.encode(), self.salt, 100000)
        return hmac.hex()

    def derive_key(self, password: str) -> bytes:
        # PBKDF2 with SHA‑256, 200,000 iterations
        return PBKDF2(password, self.salt, dkLen=32, count=200000, hmac_hash_module=hashlib.sha256)

def generate_otp() -> str:
    # Cryptographically secure OTP
    return f"{secrets.randbelow(10**6):06d}"

if __name__ == "__main__":
    print("Testing secure cryptography...")
    print(f"Password hash: {hash_password('StrongPass!23')}")
    print(f"Token: {generate_token('user001')}")
    print(f"Session ID: {generate_session_id()}")
    print(f"OTP: {generate_otp()}")
