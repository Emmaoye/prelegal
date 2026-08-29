from app.models import ChatResponse


def _stub_reply(**overrides):
    defaults = dict(document_type=None, document_name=None, reply="Hi there", fields={}, document=None)
    defaults.update(overrides)

    def stub(request):
        return ChatResponse(**defaults)

    return stub


def test_chat_message_returns_reply_and_fields(client, monkeypatch):
    monkeypatch.setattr(
        "app.routes.document_chat.get_chat_reply",
        _stub_reply(document_type="mutual_nda", document_name="Mutual NDA", reply="Got it", fields={"party_a_name": "Acme"}),
    )
    response = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "user", "content": "I need an NDA"}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Got it"
    assert body["documentType"] == "mutual_nda"
    assert body["fields"]["party_a_name"] == "Acme"


def test_chat_message_passes_known_fields_and_document_type_through(monkeypatch, client):
    captured = {}

    def stub(request):
        captured["document_type"] = request.document_type
        captured["known_fields"] = request.known_fields
        return ChatResponse(document_type=request.document_type, document_name=None, reply="ok", fields=request.known_fields, document=None)

    monkeypatch.setattr("app.routes.document_chat.get_chat_reply", stub)
    response = client.post(
        "/api/chat/message",
        json={
            "documentType": "mutual_nda",
            "messages": [{"role": "user", "content": "The purpose is a partnership"}],
            "knownFields": {"party_a_name": "Acme"},
        },
    )
    assert response.status_code == 200
    assert captured["document_type"] == "mutual_nda"
    assert captured["known_fields"] == {"party_a_name": "Acme"}


def test_chat_message_rejects_empty_messages(client):
    response = client.post("/api/chat/message", json={"messages": []})
    assert response.status_code == 422


def test_chat_message_rejects_invalid_role(client):
    response = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "system", "content": "hi"}]},
    )
    assert response.status_code == 422


def test_chat_message_returns_502_when_llm_call_fails(client, monkeypatch):
    def raise_error(request):
        raise RuntimeError("network error")

    monkeypatch.setattr("app.routes.document_chat.get_chat_reply", raise_error)
    response = client.post(
        "/api/chat/message",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 502
    assert "detail" in response.json()
