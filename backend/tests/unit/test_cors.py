from httpx import AsyncClient

VITE_DEV_ORIGIN = "http://localhost:5173"


async def test_cors_preflight_allows_the_vite_dev_origin(client: AsyncClient) -> None:
    response = await client.options(
        "/api/v1/uploads/avatar",
        headers={
            "Origin": VITE_DEV_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VITE_DEV_ORIGIN


async def test_cors_allows_the_served_media_path(client: AsyncClient) -> None:
    response = await client.get(
        "/media/avatars/missing.png",
        headers={"Origin": VITE_DEV_ORIGIN},
    )

    assert response.status_code == 404
    assert response.headers["access-control-allow-origin"] == VITE_DEV_ORIGIN


async def test_cors_does_not_allow_unknown_origins(client: AsyncClient) -> None:
    response = await client.get("/health", headers={"Origin": "http://evil.example"})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
