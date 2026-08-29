from fastapi import APIRouter, HTTPException

from app.models import NdaChatRequest, NdaChatResponse
from app.nda_chat import get_nda_chat_reply, merge_fields

router = APIRouter(prefix="/api/nda-chat", tags=["nda-chat"])


@router.post("/message", response_model=NdaChatResponse)
def send_message(request: NdaChatRequest) -> NdaChatResponse:
    try:
        result = get_nda_chat_reply(request.messages, request.known_fields)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="The assistant is temporarily unavailable. Please try again.",
        ) from exc
    return NdaChatResponse(
        reply=result.reply,
        fields=merge_fields(request.known_fields, result.extracted),
    )
