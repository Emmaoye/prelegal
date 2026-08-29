from fastapi import Cookie, HTTPException

from app.db import get_connection
from app.models import UserResponse
from app.sessions import SESSION_COOKIE_NAME, get_user_id_for_session


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> UserResponse:
    user_id = get_user_id_for_session(session_token) if session_token else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    with get_connection() as connection:
        row = connection.execute("SELECT id, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return UserResponse(id=row["id"], email=row["email"])
