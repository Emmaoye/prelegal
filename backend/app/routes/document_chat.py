from fastapi import APIRouter, Depends, HTTPException

from app.auth_dependency import get_current_user
from app.document_chat import get_chat_reply
from app.documents_store import save_document
from app.models import ChatRequest, ChatResponse, UserResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
def send_message(request: ChatRequest, user: UserResponse = Depends(get_current_user)) -> ChatResponse:
    try:
        response = get_chat_reply(request)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        ) from exc

    if request.conversation_id and response.document_type and response.document is not None:
        save_document(
            conversation_id=request.conversation_id,
            user_id=user.id,
            document_type=response.document_type,
            document_name=response.document_name or response.document.name,
            fields=response.fields,
        )
    return response
