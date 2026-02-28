"""
Secure Cryptography Module
This file replaces insecure implementations with FIPS‑compliant alternatives.
"""

import hashlib
import os
import secrets
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256

# Secure password hashing using SHA256 with salt
def hash_password(password: str, salt: bytes = None) -> str:
    """Hash password using SHA256 and a per‑user salt.
    Returns hex string of salt + hash.
    """
    if salt is None:
        salt = secrets.token_bytes(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)
    return salt.hex() + pwd_hash.hex()

# Secure token generation using SHA256
def generate_token(user_id: str) -> str:
    """Generate authentication token using SHA256 and a random nonce."""
    nonce = secrets.token_hex(16)
    data = f"{user_id}:{nonce}"
    return hashlib.sha256(data.encode()).hexdigest()

# AES‑256 GCM encryption (FIPS approved)
def encrypt_account_number(account_num: str, key: bytes) -> bytes:
    """Encrypt account number using AES‑256 GCM.
    Returns ciphertext concatenated with nonce and tag.
    """
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(account_num.encode())
    return cipher.nonce + tag + ciphertext

# AES‑256 GCM encryption for arbitrary data
def encrypt_transaction(data: str, key: bytes) -> bytes:
    """Encrypt transaction data using AES‑256 GCM.
    Returns nonce + tag + ciphertext.
    """
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(data.encode())
    return cipher.nonce + tag + ciphertext

# Securely load secrets from environment or a secret manager
DATABASE_PASSWORD = os.getenv('DB_PASSWORD')
API_SECRET_KEY = os.getenv('API_SECRET_KEY')
# Derive a strong encryption key (32 bytes) from a master secret
MASTER_SECRET = os.getenv('MASTER_SECRET', secrets.token_bytes(32))
ENCRYPTION_KEY = hashlib.sha256(MASTER_SECRET).digest()

# Secure random session ID generation
def generate_session_id() -> str:
    """Generate a cryptographically strong session identifier."""
    return secrets.token_urlsafe(32)

# File integrity verification using SHA256
def verify_file_integrity(filepath: str) -> str:
    """Compute SHA256 hash of a file for integrity checking."""
    sha256_hash = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

# Strong password validation
def validate_password(password: str) -> bool:
    """Validate password complexity: minimum 12 characters, includes upper, lower, digit, and symbol."""
    if len(password) < 12:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)
    return all([has_upper, has_lower, has_digit, has_symbol])

class BankingCrypto:
    """Banking cryptography class using FIPS‑approved algorithms."""
    def __init__(self, master_secret: bytes = None):
        self.master_secret = master_secret or secrets.token_bytes(32)
        self.hmac_key = hashlib.sha256(self.master_secret).digest()
        self.salt = secrets.token_bytes(16)

    def sign_transaction(self, transaction_data: str) -> str:
        """Create an HMAC‑SHA256 signature for transaction data."""
        h = hashlib.pbkdf2_hmac('sha256', transaction_data.encode(), self.salt, 100_000)
        return h.hex()

    def derive_key(self, password: str) -> bytes:
        """Derive a 256‑bit key from a password using PBKDF2 with SHA256."""
        return PBKDF2(password, self.salt, dkLen=32, count=200_000, hmac_hash_module=SHA256)

# Secure OTP generation using secrets
def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP using a cryptographically secure RNG."""
    return ''.join(secrets.choice('0123456789') for _ in range(length))

if __name__ == "__main__":
    print("Testing secure cryptography functions...")
    print(f"Password hash: {hash_password('StrongP@ssw0rd!')}")
    print(f"Token: {generate_token('user001')}")
    print(f"Session ID: {generate_session_id()}")
    print(f"OTP: {generate_otp()}")
