import pytest
import asyncio
from httpx import AsyncClient
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_headers(client):
    """Get auth headers using default admin credentials."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.com", "password": "admin123"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestHealth:
    async def test_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestAuth:
    async def test_login_success(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@company.com", "password": "admin123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@company.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401

    async def test_me_requires_auth(self, client):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_me_with_auth(self, client, auth_headers):
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "name" in data


class TestTemplates:
    async def test_list_templates(self, client, auth_headers):
        response = await client.get("/api/v1/templates/", headers=auth_headers)
        assert response.status_code == 200
        assert "items" in response.json()

    async def test_list_templates_no_auth(self, client):
        response = await client.get("/api/v1/templates/")
        assert response.status_code == 401


class TestEvents:
    async def test_list_events(self, client, auth_headers):
        response = await client.get("/api/v1/events/", headers=auth_headers)
        assert response.status_code == 200

    async def test_create_event(self, client, auth_headers):
        response = await client.post(
            "/api/v1/events/",
            json={
                "event_name": "Test Workshop",
                "event_date": "2024-12-01",
            },
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data["event_name"] == "Test Workshop"
        return data["id"]


class TestVerification:
    async def test_verify_invalid_cert(self, client):
        response = await client.get("/api/v1/verify/INVALID-CERT-ID")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False


class TestDashboard:
    async def test_get_stats(self, client, auth_headers):
        response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_certificates" in data
        assert "total_events" in data
        assert "total_templates" in data
