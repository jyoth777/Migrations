# Updated secure version of test_data.py
"""
Secure Banking Crypto Module – vulnerability fix
"""

import hashlib
import secrets
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Hash import SHA256

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def generate_token(uid: str) -> str:
    nonce = secrets.token_hex(16)
    return hashlib.sha256(f"{uid}:{nonce}".encode()).hexdigest()

def encrypt_account_number(num: str, key: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM)
    ct, tag = cipher.encrypt_and_digest(num.encode())
    return cipher.nonce + tag + ct

def encrypt_transaction(data: str, key: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM)
    ct, tag = cipher.encrypt_and_digest(data.encode())
    return cipher.nonce + tag + ct

import os
DATABASE_PASSWORD = os.getenv('DB_PASSWORD')
API_SECRET_KEY = os.getenv('API_SECRET_KEY')
ENCRYPTION_KEY = get_random_bytes(32)

def generate_session_id() -> str:
    return secrets.token_urlsafe(32)

def verify_file_integrity(fp: str) -> str:
    h = SHA256.new()
    with open(fp, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            h.update(chunk)
    return h.hexdigest()

def validate_password(pw: str) -> bool:
    return len(pw) >= 12 and any(c.isupper() for c in pw) and any(c.islower() for c in pw) and any(c.isdigit() for c in pw) and any(not c.isalnum() for c in pw)

class BankingCrypto:
    def __init__(self):
        self.hash_algo = 'sha256'
        self.salt = os.urandom(16)
    def sign_transaction(self, data: str) -> str:
        return hashlib.sha256(self.salt + data.encode()).hexdigest()
    def derive_key(self, pw: str) -> bytes:
        return hashlib.pbkdf2_hmac('sha256', pw.encode(), self.salt, 200_000, dklen=32)

def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

if __name__ == '__main__':
    print('Secure module test')
