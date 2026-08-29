import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def get_db_path() -> Path:
    return Path(os.environ.get("DATABASE_PATH", "data/prelegal.db"))


@contextmanager
def get_connection():
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    """(Re)create the schema from scratch. Called once on app startup so the
    database is always in a clean, known state for this foundation-only build."""
    with get_connection() as connection:
        connection.execute("DROP TABLE IF EXISTS users")
        connection.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
