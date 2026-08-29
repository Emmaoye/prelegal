from app.nda_chat import NdaChatLLMResult, NdaExtractedFields


def _stub_reply(reply: str, **extracted_overrides):
    def stub(history, known, **kwargs):
        return NdaChatLLMResult(reply=reply, extracted=NdaExtractedFields(**extracted_overrides))

    return stub


def test_chat_message_returns_reply_and_merged_fields(client, monkeypatch):
    monkeypatch.setattr(
        "app.routes.nda_chat.get_nda_chat_reply",
        _stub_reply("Got it, what's Party B's name?", party_a_name="Acme Corp"),
    )
    response = client.post(
        "/api/nda-chat/message",
        json={"messages": [{"role": "user", "content": "Party A is Acme Corp"}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Got it, what's Party B's name?"
    assert body["fields"]["partyA"]["name"] == "Acme Corp"
    assert body["fields"]["termYears"] == "2"


def test_chat_message_preserves_already_known_fields_not_reextracted(client, monkeypatch):
    monkeypatch.setattr(
        "app.routes.nda_chat.get_nda_chat_reply",
        _stub_reply("What's the effective date?"),
    )
    response = client.post(
        "/api/nda-chat/message",
        json={
            "messages": [{"role": "user", "content": "The purpose is a partnership"}],
            "knownFields": {"partyA": {"name": "Acme Corp", "address": "123 Main St"}},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["fields"]["partyA"]["name"] == "Acme Corp"
    assert body["fields"]["partyA"]["address"] == "123 Main St"


def test_chat_message_rejects_empty_messages(client):
    response = client.post("/api/nda-chat/message", json={"messages": []})
    assert response.status_code == 422


def test_chat_message_rejects_invalid_role(client):
    response = client.post(
        "/api/nda-chat/message",
        json={"messages": [{"role": "system", "content": "hi"}]},
    )
    assert response.status_code == 422


def test_chat_message_returns_502_when_llm_call_fails(client, monkeypatch):
    def raise_error(history, known, **kwargs):
        raise RuntimeError("network error")

    monkeypatch.setattr("app.routes.nda_chat.get_nda_chat_reply", raise_error)
    response = client.post(
        "/api/nda-chat/message",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 502
    assert "detail" in response.json()
