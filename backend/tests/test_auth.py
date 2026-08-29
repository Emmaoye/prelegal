def test_signup_creates_user(client):
    response = client.post(
        "/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "a@example.com"
    assert "id" in body


def test_signup_sets_session_cookie(client):
    response = client.post(
        "/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"}
    )
    assert "session_token" in response.cookies


def test_signup_duplicate_email_conflicts(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    response = client.post(
        "/api/auth/signup", json={"email": "a@example.com", "password": "different"}
    )
    assert response.status_code == 409


def test_signup_rejects_invalid_email(client):
    response = client.post(
        "/api/auth/signup", json={"email": "not-an-email", "password": "hunter2"}
    )
    assert response.status_code == 422


def test_signin_with_correct_password_succeeds(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    response = client.post(
        "/api/auth/signin", json={"email": "a@example.com", "password": "hunter2"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "a@example.com"
    assert "session_token" in response.cookies


def test_signin_with_wrong_password_is_rejected(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    response = client.post(
        "/api/auth/signin", json={"email": "a@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_signin_unknown_email_is_rejected(client):
    response = client.post(
        "/api/auth/signin", json={"email": "nobody@example.com", "password": "hunter2"}
    )
    assert response.status_code == 401


def test_me_returns_current_user_when_signed_in(authed_client):
    response = authed_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"


def test_me_rejects_unauthenticated_request(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_session(authed_client):
    assert authed_client.get("/api/auth/me").status_code == 200
    logout_response = authed_client.post("/api/auth/logout")
    assert logout_response.status_code == 204
    assert authed_client.get("/api/auth/me").status_code == 401


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
