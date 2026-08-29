from fastapi import APIRouter, Depends, HTTPException

from app.auth_dependency import get_current_user
from app.documents_store import get_document, list_documents
from app.models import DocumentDetailOut, DocumentSummaryOut, UserResponse

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=list[DocumentSummaryOut])
def list_my_documents(user: UserResponse = Depends(get_current_user)) -> list[DocumentSummaryOut]:
    return list_documents(user.id)


@router.get("/{document_id}", response_model=DocumentDetailOut)
def get_my_document(document_id: str, user: UserResponse = Depends(get_current_user)) -> DocumentDetailOut:
    document = get_document(document_id, user.id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document
