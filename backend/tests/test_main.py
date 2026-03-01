import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.mark.asyncio
async def test_read_main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "service": "lumina-backend",
        "docs": "/docs",
        "health": "/api/health",
    }

@pytest.mark.asyncio
async def test_get_jobs_empty_or_schema():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/jobs")
    assert response.status_code == 200
    assert "jobs" in response.json()

@pytest.mark.asyncio
async def test_get_invalid_job():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/status/invalid-job-id")
    assert response.status_code == 404
