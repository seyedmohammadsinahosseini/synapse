"""Authentication, hashing utilities, and rate limiting helpers."""
import base64
import hashlib
import hmac
import os
import re
import secrets
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

# Load environment configuration
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.environ.get("APP_SECRET")
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)
    print("[security] WARNING: APP_SECRET not set in environment. Using generated fallback.")

ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24 * 30  # 30-day token lifetime
ITERATIONS = 120_000

bearer = HTTPBearer(auto_error=False)


# ── Rate Limiter ──────────────────────────────────────────────────────────
class RateLimiter:
    """Sliding-window in-memory rate limiter."""
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        with self.lock:
            timestamps = [t for t in self.requests[key] if now - t < self.window_seconds]
            if len(timestamps) >= self.max_requests:
                self.requests[key] = timestamps
                return False
            timestamps.append(now)
            self.requests[key] = timestamps
            return True


# Preconfigured rate limiters
login_limiter = RateLimiter(max_requests=30, window_seconds=60)
register_limiter = RateLimiter(max_requests=30, window_seconds=60)
ai_chat_limiter = RateLimiter(max_requests=60, window_seconds=60)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(limiter: RateLimiter):
    def dep(request: Request):
        ip = get_client_ip(request)
        if not limiter.is_allowed(ip):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait a moment and try again.",
            )
    return dep


# ── Password Validation & Hashing ──────────────────────────────────────────
def validate_password(password: str) -> str | None:
    """Enforce minimum password complexity (length > 8, at least 1 letter, at least 1 digit)."""
    if not password or len(password) < 9:
        return "Password must be at least 9 characters long"
    if not re.search(r"[^\W\d_]", password):
        return "Password must contain at least one letter"
    if not re.search(r"\d", password):
        return "Password must contain at least one digit"
    return None


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return "pbkdf2${}${}${}".format(
        ITERATIONS,
        base64.b64encode(salt).decode(),
        base64.b64encode(dk).decode(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iters))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ── JWT Session Token Management ───────────────────────────────────────────
def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM],
                      options={"verify_sub": False})


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_roles(*roles: str):
    def dep(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
        return user
    return dep
