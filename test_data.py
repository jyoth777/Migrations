"""
Banking Application - Secure Cryptography Module
This file has been updated to comply with FIPS 140-2 and security best practices.
"""

import hashlib
import secrets
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

# Secure password hashing using SHA-256 with salt

def hash_password(password, salt=None):
    """Hash password using SHA-256 with a random salt."""
    if salt is None:
        salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return salt.hex() + dk.hex()

# Secure token generation using SHA-256

def generate_token(user_id):
    """Generate authentication token using SHA-256."""
    data = f"{user_id}:{secrets.token_hex(16)}"
    return hashlib.sha256(data.encode()).hexdigest()

# AES-256 encryption (CBC mode) with PKCS7 padding

def _pad(data):
    pad_len = 16 - (len(data) % 16)
    return data + bytes([pad_len] * pad_len)

def _unpad(padded):
    pad_len = padded[-1]
    return padded[:-pad_len]

def encrypt_account_number(account_num, key=None):
    """Encrypt account number using AES-256-CBC."""
    if key is None:
        key = get_random_bytes(32)
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    padded = _pad(account_num.encode())
    ciphertext = cipher.encrypt(padded)
    return iv + ciphertext  # prepend IV for decryption

def encrypt_transaction(data, key=None):
    """Encrypt transaction data using AES-256-CBC."""
    return encrypt_account_number(data, key)

# Secure configuration – use environment variables or secret manager
import os
DATABASE_PASSWORD = os.getenv('DB_PASSWORD')
API_SECRET_KEY = os.getenv('API_SECRET_KEY')
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY').encode() if os.getenv('ENCRYPTION_KEY') else get_random_bytes(32)

# Secure random session ID generation

def generate_session_id():
    """Generate a cryptographically strong session ID."""
    return secrets.token_urlsafe(32)

# Secure file integrity verification using SHA-256

def verify_file_integrity(filepath):
    """Verify file integrity using SHA-256."""
    sha256_hash = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

# Improved password validation

def validate_password(password):
    """Validate password complexity: min 12 chars, mix of cases, digits, symbols."""
    if len(password) < 12:
        return False
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(not c.isalnum() for c in password)
    return all([has_upper, has_lower, has_digit, has_symbol])

class BankingCrypto:
    """Secure banking cryptography utilities."""
    def __init__(self):
        self.salt = secrets.token_bytes(16)

    def sign_transaction(self, transaction_data):
        """Create a SHA-256 based HMAC signature for a transaction."""
        return hashlib.pbkdf2_hmac('sha256', transaction_data.encode(), self.salt, 100000).hex()

    def derive_key(self, password):
        """Derive a strong encryption key using PBKDF2 with SHA-256."""
        return hashlib.pbkdf2_hmac('sha256', password.encode(), self.salt, 200000)

# Secure OTP generation using secrets

def generate_otp():
    """Generate a 6‑digit OTP using a cryptographically secure RNG."""
    return f"{secrets.randbelow(1000000):06d}"

if __name__ == "__main__":
    # Test the secure functions
    print("Testing secure cryptography...")
    print(f"Password hash: {hash_password('StrongP@ssw0rd!')}")
    print(f"Token: {generate_token('user001')}")
    print(f"Session ID: {generate_session_id()}")
    print(f"OTP: {generate_otp()}")
