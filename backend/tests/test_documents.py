def test_list_documents_rejects_unauthenticated_request(client):
    response = client.get("/api/documents")
    assert response.status_code == 401


def test_get_document_rejects_unauthenticated_request(client):
    response = client.get("/api/documents/some-id")
    assert response.status_code == 401


def test_list_documents_is_empty_for_new_user(authed_client):
    response = authed_client.get("/api/documents")
    assert response.status_code == 200
    assert response.json() == []


def test_get_document_returns_saved_fields_and_rendering(authed_client, monkeypatch):
    from app.document_chat import render_document
    from app.models import ChatResponse

    fields = {"party_a_name": "Acme", "party_b_name": "Widget Co"}
    monkeypatch.setattr(
        "app.routes.document_chat.get_chat_reply",
        lambda request: ChatResponse(
            document_type="mutual_nda",
            document_name="Mutual NDA",
            reply="Here you go",
            fields=fields,
            document=render_document("mutual_nda", fields),
        ),
    )
    authed_client.post(
        "/api/chat/message",
        json={
            "conversationId": "conversation-1",
            "messages": [{"role": "user", "content": "I need an NDA between Acme and Widget Co"}],
        },
    )

    response = authed_client.get("/api/documents/conversation-1")
    assert response.status_code == 200
    body = response.json()
    assert body["documentType"] == "mutual_nda"
    assert body["fields"]["party_a_name"] == "Acme"
    assert body["document"]["slug"] == "mutual_nda"


def test_get_document_404s_for_unknown_id(authed_client):
    response = authed_client.get("/api/documents/does-not-exist")
    assert response.status_code == 404


def test_get_document_404s_for_another_users_document(authed_client, client, monkeypatch):
    from app.document_chat import render_document
    from app.models import ChatResponse

    fields = {"party_a_name": "Acme"}

    def stub(request):
        return ChatResponse(
            document_type="mutual_nda",
            document_name="Mutual NDA",
            reply="ok",
            fields=fields,
            document=render_document("mutual_nda", fields),
        )

    monkeypatch.setattr("app.routes.document_chat.get_chat_reply", stub)
    authed_client.post(
        "/api/chat/message",
        json={"conversationId": "conversation-1", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert authed_client.get("/api/documents/conversation-1").status_code == 200

    client.post("/api/auth/signup", json={"email": "other@example.com", "password": "hunter2"})
    response = client.get("/api/documents/conversation-1")
    assert response.status_code == 404


def test_saving_a_document_does_not_overwrite_another_users_document_with_the_same_id(
    authed_client, client, monkeypatch
):
    from app.document_chat import render_document
    from app.models import ChatResponse

    def stub_for(fields, name):
        def stub(request):
            return ChatResponse(
                document_type="mutual_nda",
                document_name=name,
                reply="ok",
                fields=fields,
                document=render_document("mutual_nda", fields),
            )

        return stub

    monkeypatch.setattr("app.routes.document_chat.get_chat_reply", stub_for({"party_a_name": "Acme"}, "Acme's NDA"))
    authed_client.post(
        "/api/chat/message",
        json={"conversationId": "conversation-1", "messages": [{"role": "user", "content": "hi"}]},
    )

    # A second user reuses the same client-generated conversation id -
    # their save must be a no-op, not an overwrite of the first user's row.
    client.post("/api/auth/signup", json={"email": "other@example.com", "password": "hunter2"})
    monkeypatch.setattr(
        "app.routes.document_chat.get_chat_reply", stub_for({"party_a_name": "Mallory Corp"}, "Mallory's NDA")
    )
    client.post(
        "/api/chat/message",
        json={"conversationId": "conversation-1", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert client.get("/api/documents").json() == []

    client.post("/api/auth/signin", json={"email": "user@example.com", "password": "hunter2"})
    response = client.get("/api/documents/conversation-1")
    assert response.status_code == 200
    assert response.json()["documentName"] == "Acme's NDA"
    assert response.json()["fields"]["party_a_name"] == "Acme"
