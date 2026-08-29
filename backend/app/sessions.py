import secrets
from datetime import datetime, timedelta, timezone

from app.db import get_connection

SESSION_COOKIE_NAME = "session_token"
SESSION_TTL = timedelta(days=7)
SESSION_TTL_SECONDS = int(SESSION_TTL.total_seconds())


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + SESSION_TTL
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at.isoformat()),
        )
    return token


def get_user_id_for_session(token: str) -> int | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT user_id, expires_at FROM sessions WHERE id = ?", (token,)
        ).fetchone()
    if row is None:
        return None
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        return None
    return row["user_id"]


def delete_session(token: str) -> None:
    with get_connection() as connection:
        connection.execute("DELETE FROM sessions WHERE id = ?", (token,))
