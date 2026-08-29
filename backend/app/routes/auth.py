import sqlite3

import bcrypt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.auth_dependency import get_current_user
from app.db import get_connection
from app.models import SigninRequest, SignupRequest, UserResponse
from app.sessions import SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, create_session, delete_session

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, user_id: int) -> None:
    token = create_session(user_id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_SECONDS,
    )


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(request: SignupRequest, response: Response) -> UserResponse:
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
    _set_session_cookie(response, user_id)
    return UserResponse(id=user_id, email=request.email)


@router.post("/signin", response_model=UserResponse)
def signin(request: SigninRequest, response: Response) -> UserResponse:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?", (request.email,)
        ).fetchone()
    # Same error for an unknown email and a wrong password, so a caller can't
    # use signin to enumerate which emails have accounts.
    if row is None or not bcrypt.checkpw(request.password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    _set_session_cookie(response, row["id"])
    return UserResponse(id=row["id"], email=row["email"])


@router.get("/me", response_model=UserResponse)
def me(user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return user


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> None:
    if session_token:
        delete_session(session_token)
    response.delete_cookie(SESSION_COOKIE_NAME)
