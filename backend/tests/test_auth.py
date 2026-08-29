def test_signup_creates_user(client):
    response = client.post(
        "/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "a@example.com"
    assert "id" in body


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


def test_signin_finds_existing_user(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    response = client.post(
        "/api/auth/signin", json={"email": "a@example.com", "password": "wrong-password"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "a@example.com"


def test_signin_unknown_email_not_found(client):
    response = client.post(
        "/api/auth/signin", json={"email": "nobody@example.com", "password": "hunter2"}
    )
    assert response.status_code == 404


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
