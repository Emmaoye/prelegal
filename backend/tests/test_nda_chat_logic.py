from datetime import date

from app.models import ChatMessage, NdaFields, PartyFields
from app.nda_chat import (
    NdaChatLLMResult,
    NdaExtractedFields,
    build_messages,
    get_nda_chat_reply,
    merge_fields,
)


def _known(**overrides) -> NdaFields:
    fields = NdaFields()
    for key, value in overrides.items():
        setattr(fields, key, value)
    return fields


def test_merge_fields_fills_blank_field():
    known = _known()
    extracted = NdaExtractedFields(party_a_name="Acme Corp")
    merged = merge_fields(known, extracted)
    assert merged.party_a.name == "Acme Corp"


def test_merge_fields_does_not_overwrite_known_when_extraction_blank():
    known = _known(party_a=PartyFields(name="Acme Corp", address=""))
    extracted = NdaExtractedFields(party_a_name=None)
    merged = merge_fields(known, extracted)
    assert merged.party_a.name == "Acme Corp"


def test_merge_fields_does_not_overwrite_known_with_whitespace_only():
    known = _known(purpose="Evaluating a partnership")
    extracted = NdaExtractedFields(purpose="   ")
    merged = merge_fields(known, extracted)
    assert merged.purpose == "Evaluating a partnership"


def test_merge_fields_allows_explicit_correction():
    known = _known(governing_state="Delaware")
    extracted = NdaExtractedFields(governing_state="California")
    merged = merge_fields(known, extracted)
    assert merged.governing_state == "California"


def test_merge_fields_rejects_non_iso_effective_date():
    known = _known(effective_date="2026-01-01")
    extracted = NdaExtractedFields(effective_date="next Friday")
    merged = merge_fields(known, extracted)
    assert merged.effective_date == "2026-01-01"


def test_merge_fields_accepts_valid_iso_effective_date():
    known = _known()
    extracted = NdaExtractedFields(effective_date="2026-03-01")
    merged = merge_fields(known, extracted)
    assert merged.effective_date == "2026-03-01"


def test_merge_fields_rejects_non_numeric_term_years():
    known = _known(term_years="2")
    extracted = NdaExtractedFields(term_years="two years")
    merged = merge_fields(known, extracted)
    assert merged.term_years == "2"


def test_merge_fields_accepts_digit_term_years():
    known = _known(term_years="2")
    extracted = NdaExtractedFields(term_years="5")
    merged = merge_fields(known, extracted)
    assert merged.term_years == "5"


def test_build_messages_puts_system_message_first():
    messages = build_messages([], NdaFields(), date(2026, 1, 1))
    assert messages[0]["role"] == "system"


def test_build_messages_lists_known_field_as_confirmed():
    known = _known(party_a=PartyFields(name="Acme Corp", address=""))
    messages = build_messages([], known, date(2026, 1, 1))
    system_content = messages[0]["content"]
    assert "Acme Corp" in system_content
    assert "party_a_address" in system_content


def test_build_messages_lists_unset_field_as_still_needed():
    messages = build_messages([], NdaFields(), date(2026, 1, 1))
    system_content = messages[0]["content"]
    assert "party_a_name" in system_content


def test_build_messages_preserves_conversation_history_in_order():
    history = [
        ChatMessage(role="assistant", content="Hi, what's Party A's name?"),
        ChatMessage(role="user", content="Acme Corp"),
    ]
    messages = build_messages(history, NdaFields(), date(2026, 1, 1))
    assert messages[1] == {"role": "assistant", "content": "Hi, what's Party A's name?"}
    assert messages[2] == {"role": "user", "content": "Acme Corp"}


class _FakeMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _FakeChoice:
    def __init__(self, content: str) -> None:
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_FakeChoice(content)]


def test_get_nda_chat_reply_parses_completion_result(monkeypatch):
    result = NdaChatLLMResult(
        reply="Got it, what's Party B's name?",
        extracted=NdaExtractedFields(party_a_name="Acme Corp"),
    )
    captured_kwargs = {}

    def fake_completion(**kwargs):
        captured_kwargs.update(kwargs)
        return _FakeResponse(result.model_dump_json())

    monkeypatch.setattr("app.nda_chat.completion", fake_completion)

    history = [ChatMessage(role="user", content="Acme Corp")]
    parsed = get_nda_chat_reply(history, NdaFields(), today=date(2026, 1, 1))

    assert parsed.reply == "Got it, what's Party B's name?"
    assert parsed.extracted.party_a_name == "Acme Corp"
    assert captured_kwargs["model"] == "openrouter/openai/gpt-oss-120b"
    assert captured_kwargs["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert captured_kwargs["response_format"] is NdaChatLLMResult
