import sqlite3

import bcrypt
from fastapi import APIRouter, HTTPException

from app.db import get_connection
from app.models import SigninRequest, SignupRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(request: SignupRequest) -> UserResponse:
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (request.email, password_hash),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already registered")
    return UserResponse(id=user_id, email=request.email)


@router.post("/signin", response_model=UserResponse)
def signin(request: SigninRequest) -> UserResponse:
    # Foundation-only: this looks the user up by email but does not verify the
    # password. Real credential verification is out of scope for this ticket.
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, email FROM users WHERE email = ?", (request.email,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="No account found for this email")
    return UserResponse(id=row["id"], email=row["email"])
