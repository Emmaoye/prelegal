import json

from app.document_chat import (
    PARTY_A_FIELD,
    PARTY_B_FIELD,
    ClassificationResult,
    classify_document_type,
    get_chat_reply,
    get_field_extraction_reply,
    merge_fields,
    render_document,
)
from app.models import ChatMessage, ChatRequest
from app.models import FieldRunOut


class _FakeMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class _FakeChoice:
    def __init__(self, content: str) -> None:
        self.message = _FakeMessage(content)


class _FakeResponse:
    def __init__(self, content: str) -> None:
        self.choices = [_FakeChoice(content)]


def _fake_completion(content: str):
    def fake(**kwargs):
        return _FakeResponse(content)

    return fake


def test_merge_fields_fills_blank_field():
    merged = merge_fields({}, {"purpose": "Evaluating a partnership"})
    assert merged["purpose"] == "Evaluating a partnership"


def test_merge_fields_does_not_overwrite_known_when_extraction_none():
    merged = merge_fields({"party_a_name": "Acme Corp"}, {"party_a_name": None})
    assert merged["party_a_name"] == "Acme Corp"


def test_merge_fields_does_not_overwrite_known_with_whitespace_only():
    merged = merge_fields({"purpose": "Evaluating a partnership"}, {"purpose": "   "})
    assert merged["purpose"] == "Evaluating a partnership"


def test_merge_fields_allows_explicit_correction():
    merged = merge_fields({"governing_law": "Delaware"}, {"governing_law": "California"})
    assert merged["governing_law"] == "California"


def test_merge_fields_preserves_untouched_known_keys():
    merged = merge_fields({"purpose": "Existing"}, {"party_a_name": "Acme"})
    assert merged["purpose"] == "Existing"
    assert merged["party_a_name"] == "Acme"


def test_classify_document_type_returns_matched_slug(monkeypatch):
    monkeypatch.setattr(
        "app.document_chat.completion",
        _fake_completion(json.dumps({"reply": "Great, an NDA it is.", "document_type": "mutual_nda"})),
    )
    result = classify_document_type([ChatMessage(role="user", content="I need an NDA")])
    assert result.document_type == "mutual_nda"


def test_classify_document_type_rejects_unknown_slug_from_model(monkeypatch):
    monkeypatch.setattr(
        "app.document_chat.completion",
        _fake_completion(json.dumps({"reply": "Sure thing.", "document_type": "not-a-real-slug"})),
    )
    result = classify_document_type([ChatMessage(role="user", content="I need a trademark license")])
    assert result.document_type is None


def test_classify_document_type_forces_a_question_when_unresolved(monkeypatch):
    monkeypatch.setattr(
        "app.document_chat.completion",
        _fake_completion(json.dumps({"reply": "We don't offer that.", "document_type": None})),
    )
    result = classify_document_type([ChatMessage(role="user", content="I need a trademark license")])
    assert result.document_type is None
    assert "?" in result.reply


def test_get_field_extraction_reply_parses_dynamic_schema(monkeypatch):
    content = json.dumps(
        {
            "reply": "Got it, what's the effective date?",
            "extracted": {"party_a_name": "Acme Corp"},
        }
    )
    monkeypatch.setattr("app.document_chat.completion", _fake_completion(content))
    result = get_field_extraction_reply(
        "mutual_nda",
        [ChatMessage(role="user", content="We're Acme Corp")],
        {},
    )
    assert result.extracted["party_a_name"] == "Acme Corp"
    assert result.reply == "Got it, what's the effective date?"


def test_get_field_extraction_reply_forces_follow_up_question_when_fields_missing(monkeypatch):
    content = json.dumps(
        {
            "reply": "Thanks, noted.",
            "extracted": {"party_a_name": "Acme Corp"},
        }
    )
    monkeypatch.setattr("app.document_chat.completion", _fake_completion(content))
    result = get_field_extraction_reply(
        "mutual_nda",
        [ChatMessage(role="user", content="We're Acme Corp")],
        {},
    )
    assert result.reply.rstrip().endswith("?")


def test_get_field_extraction_reply_does_not_force_question_when_complete(monkeypatch):
    known = {
        "party_a_name": "Acme",
        "party_b_name": "Widget Co",
        "purpose": "partnership",
        "effective_date": "2026-01-01",
        "mnda_term": "2 years",
        "term_of_confidentiality": "5 years",
        "governing_law": "Delaware",
        "jurisdiction": "Delaware",
    }
    content = json.dumps({"reply": "All set, ready to download.", "extracted": {}})
    monkeypatch.setattr("app.document_chat.completion", _fake_completion(content))
    result = get_field_extraction_reply(
        "mutual_nda",
        [ChatMessage(role="user", content="That's everything")],
        known,
    )
    assert result.reply == "All set, ready to download."


def test_render_document_fills_known_values_and_brackets_unknowns():
    document = render_document("mutual_nda", {"purpose": "Evaluating a partnership"})
    all_runs = [r for block in document.blocks for r in block.runs]
    field_runs = {r.key: r for r in all_runs if isinstance(r, FieldRunOut)}
    assert field_runs["purpose"].value == "Evaluating a partnership"
    assert field_runs["effective_date"].value == ""


def test_render_document_includes_synthetic_parties_block():
    document = render_document("mutual_nda", {"party_a_name": "Acme", "party_b_name": "Widget Co"})
    assert document.blocks[0].heading == "Parties"
    party_keys = {r.key for r in document.blocks[0].runs if isinstance(r, FieldRunOut)}
    assert party_keys == {PARTY_A_FIELD.key, PARTY_B_FIELD.key}


def test_get_field_extraction_reply_round_trips_a_larger_non_nda_document_type(monkeypatch):
    # The NDA is the simplest template (8 fields, flat). CSA has 20+ fields
    # across deeper nesting - this exercises the dynamically-built pydantic
    # schema, extraction, merge, and rendering against a structurally
    # different, larger template so a schema-construction bug isolated to
    # bigger field sets wouldn't hide behind NDA-only test coverage.
    content = json.dumps(
        {
            "reply": "Got it, what's the subscription period?",
            "extracted": {"party_a_name": "Acme Corp", "customer": "Acme Corp", "provider": "Widget Co"},
        }
    )
    monkeypatch.setattr("app.document_chat.completion", _fake_completion(content))

    result = get_field_extraction_reply(
        "csa",
        [ChatMessage(role="user", content="Acme Corp is the customer, Widget Co is the provider")],
        {},
    )
    assert result.extracted["customer"] == "Acme Corp"
    assert result.extracted["provider"] == "Widget Co"

    merged = merge_fields({}, result.extracted)
    document = render_document("csa", merged)
    all_field_runs = [r for block in document.blocks for r in block.runs if isinstance(r, FieldRunOut)]
    customer_runs = [r for r in all_field_runs if r.key == "customer"]
    assert customer_runs, "expected at least one 'customer' field run in the rendered CSA"
    assert all(r.value == "Acme Corp" for r in customer_runs)


def test_get_chat_reply_runs_classification_then_extraction_on_type_confirmation(monkeypatch):
    responses = iter(
        [
            json.dumps({"reply": "Great, an NDA.", "document_type": "mutual_nda"}),
            json.dumps({"reply": "What's the purpose?", "extracted": {"party_a_name": "Acme"}}),
        ]
    )
    monkeypatch.setattr(
        "app.document_chat.completion", lambda **kwargs: _FakeResponse(next(responses))
    )
    request = ChatRequest(messages=[ChatMessage(role="user", content="I need an NDA, we're Acme")])
    response = get_chat_reply(request)
    assert response.document_type == "mutual_nda"
    assert response.fields["party_a_name"] == "Acme"
    assert response.document is not None


def test_get_chat_reply_stays_unresolved_when_classification_has_no_match(monkeypatch):
    monkeypatch.setattr(
        "app.document_chat.completion",
        _fake_completion(json.dumps({"reply": "We can't make that, how about an NDA instead?", "document_type": None})),
    )
    request = ChatRequest(messages=[ChatMessage(role="user", content="I need a trademark license")])
    response = get_chat_reply(request)
    assert response.document_type is None
    assert response.document is None


def test_get_chat_reply_skips_classification_when_document_type_already_known(monkeypatch):
    monkeypatch.setattr(
        "app.document_chat.completion",
        _fake_completion(json.dumps({"reply": "Noted.", "extracted": {"purpose": "Partnership"}})),
    )
    request = ChatRequest(
        document_type="mutual_nda",
        messages=[ChatMessage(role="user", content="The purpose is a partnership")],
        known_fields={"party_a_name": "Acme"},
    )
    response = get_chat_reply(request)
    assert response.document_type == "mutual_nda"
    assert response.fields["party_a_name"] == "Acme"
    assert response.fields["purpose"] == "Partnership"
