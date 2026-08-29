from typing import Literal

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
    the frontend's NdaFormData verbatim with no adapter code needed."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PartyFields(CamelModel):
    name: str = ""
    address: str = ""


class NdaFields(CamelModel):
    """Wire-identical to the frontend's NdaFormData shape."""

    party_a: PartyFields = Field(default_factory=PartyFields)
    party_b: PartyFields = Field(default_factory=PartyFields)
    effective_date: str = ""
    purpose: str = ""
    term_years: str = "2"
    governing_state: str = ""


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class NdaChatRequest(CamelModel):
    messages: list[ChatMessage] = Field(min_length=1)
    known_fields: NdaFields = Field(default_factory=NdaFields)


class NdaChatResponse(CamelModel):
    reply: str
    fields: NdaFields
