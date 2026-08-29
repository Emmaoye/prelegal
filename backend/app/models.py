from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SigninRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: int
    email: str


class CamelModel(BaseModel):
    """Base for wire models whose JSON shape must be camelCase, so it matches
    the frontend's shapes verbatim with no adapter code needed."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(CamelModel):
    """Stateless per-turn chat request. `document_type` is None until the
    assistant has confirmed which of the catalog's document types the user
    wants; `known_fields` is whatever field values have been confirmed so
    far, keyed by the field keys documents.py/document_templates.py exposes."""

    document_type: str | None = None
    messages: list[ChatMessage] = Field(min_length=1)
    known_fields: dict[str, str] = Field(default_factory=dict)


class TextRunOut(CamelModel):
    type: Literal["text"] = "text"
    text: str
    bold: bool = False


class LinkRunOut(CamelModel):
    type: Literal["link"] = "link"
    text: str
    href: str
    bold: bool = False


class FieldRunOut(CamelModel):
    type: Literal["field"] = "field"
    key: str
    label: str
    possessive: bool = False
    value: str = ""


RunOut = Annotated[Union[TextRunOut, LinkRunOut, FieldRunOut], Field(discriminator="type")]


class DocumentBlockOut(CamelModel):
    level: int
    marker: str
    heading: str | None = None
    runs: list[RunOut]


class RenderedDocumentOut(CamelModel):
    slug: str
    name: str
    blocks: list[DocumentBlockOut]


class ChatResponse(CamelModel):
    document_type: str | None
    document_name: str | None
    reply: str
    fields: dict[str, str]
    document: RenderedDocumentOut | None
