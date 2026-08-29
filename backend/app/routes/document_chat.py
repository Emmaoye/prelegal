from fastapi import APIRouter, HTTPException

from app.document_chat import get_chat_reply
from app.models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
def send_message(request: ChatRequest) -> ChatResponse:
    try:
        return get_chat_reply(request)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        ) from exc
