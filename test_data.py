"""
Banking Application - Insecure Cryptography Module
This file contains multiple FIPS compliance violations and security issues
for testing the security agent's detection capabilities.
"""

import hashlib
import random
from Crypto.Cipher import DES, ARC4
from Crypto.Hash import MD5, SHA1

# ❌ FIPS VIOLATION: MD5 is not FIPS 140-2 approved
def hash_password(password):
    """Hash password using MD5 (INSECURE)"""
    return hashlib.md5(password.encode()).hexdigest()

# ❌ FIPS VIOLATION: SHA1 is deprecated and not FIPS approved
def generate_token(user_id):
    """Generate authentication token using SHA1 (INSECURE)"""
    data = f"{user_id}:{random.random()}"
    return hashlib.sha1(data.encode()).hexdigest()

# ❌ FIPS VIOLATION: DES is deprecated (use AES-256)
def encrypt_account_number(account_num, key):
    """Encrypt account number using DES (INSECURE)"""
    cipher = DES.new(key, DES.MODE_ECB)
    # Pad to 8 bytes
    padded = account_num.ljust(8)[:8]
    return cipher.encrypt(padded.encode())

# ❌ FIPS VIOLATION: RC4 is not FIPS approved
def encrypt_transaction(data, key):
    """Encrypt transaction using RC4 (INSECURE)"""
    cipher = ARC4.new(key)
    return cipher.encrypt(data.encode())

# ❌ SECURITY ISSUE: Hardcoded credentials
DATABASE_PASSWORD = "admin123"
API_SECRET_KEY = "hardcoded_secret_key_12345"
ENCRYPTION_KEY = b"weakkey1"  # Only 8 bytes, too short

# ❌ SECURITY ISSUE: Weak random number generation
def generate_session_id():
    """Generate session ID using weak RNG"""
    return str(random.random())

# ❌ FIPS VIOLATION: MD5 for file integrity
def verify_file_integrity(filepath):
    """Verify file integrity using MD5 (INSECURE)"""
    md5_hash = MD5.new()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()

# ❌ SECURITY ISSUE: Insecure password validation
def validate_password(password):
    """Weak password validation"""
    return len(password) >= 6  # Too short, no complexity requirements

class BankingCrypto:
    """Banking cryptography class with multiple issues"""
    
    def __init__(self):
        # ❌ FIPS VIOLATION: Using MD5 for HMAC
        self.hash_algo = 'md5'
        # ❌ SECURITY ISSUE: Hardcoded salt
        self.salt = b'fixed_salt_value'
    
    # ❌ FIPS VIOLATION: SHA1 for digital signatures
    def sign_transaction(self, transaction_data):
        """Sign transaction using SHA1 (INSECURE)"""
        return SHA1.new(transaction_data.encode()).hexdigest()
    
    # ❌ SECURITY ISSUE: Weak key derivation
    def derive_key(self, password):
        """Derive encryption key from password (INSECURE)"""
        # Should use PBKDF2 with high iteration count
        return hashlib.md5(password.encode() + self.salt).digest()

# ❌ SECURITY ISSUE: Insecure random for cryptographic purposes
def generate_otp():
    """Generate OTP using insecure random"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

if __name__ == "__main__":
    # Test the insecure functions
    print("Testing insecure cryptography...")
    print(f"Password hash: {hash_password('password123')}")
    print(f"Token: {generate_token('user001')}")
    print(f"Session ID: {generate_session_id()}")
    print(f"OTP: {generate_otp()}")
