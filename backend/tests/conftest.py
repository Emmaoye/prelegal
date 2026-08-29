import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.setenv("STATIC_DIR", str(tmp_path / "static"))

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def authed_client(client):
    """A client that has signed up and is carrying a valid session cookie,
    for tests of routes gated behind get_current_user."""
    client.post("/api/auth/signup", json={"email": "user@example.com", "password": "hunter2"})
    return client
