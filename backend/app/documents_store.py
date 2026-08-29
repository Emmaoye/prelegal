import json
from datetime import datetime, timezone

from app.db import get_connection
from app.document_chat import render_document
from app.models import DocumentDetailOut, DocumentSummaryOut


def save_document(conversation_id: str, user_id: int, document_type: str, document_name: str, fields: dict[str, str]) -> None:
    """Upsert by (conversation_id, user_id) - `conversation_id` is client-
    supplied, so the conflict-target WHERE guards against a colliding id
    from a different user silently overwriting someone else's document
    instead of just being ignored."""
    now = datetime.now(timezone.utc).isoformat()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO documents (id, user_id, document_type, document_name, fields, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                document_type = excluded.document_type,
                document_name = excluded.document_name,
                fields = excluded.fields,
                updated_at = excluded.updated_at
            WHERE documents.user_id = ?
            """,
            (conversation_id, user_id, document_type, document_name, json.dumps(fields), now, user_id),
        )


def list_documents(user_id: int) -> list[DocumentSummaryOut]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, document_type, document_name, updated_at FROM documents "
            "WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
    return [
        DocumentSummaryOut(
            id=row["id"],
            document_type=row["document_type"],
            document_name=row["document_name"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def get_document(document_id: str, user_id: int) -> DocumentDetailOut | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, document_type, document_name, fields, updated_at FROM documents "
            "WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        ).fetchone()
    if row is None:
        return None
    fields = json.loads(row["fields"])
    return DocumentDetailOut(
        id=row["id"],
        document_type=row["document_type"],
        document_name=row["document_name"],
        fields=fields,
        document=render_document(row["document_type"], fields),
        updated_at=row["updated_at"],
    )
