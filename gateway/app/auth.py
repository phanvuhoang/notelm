"""API-key auth + cached backend admin login."""
from __future__ import annotations

import asyncio
import logging
import time

import httpx
from fastapi import Depends, Header, HTTPException, status

from .config import settings

log = logging.getLogger("notelm.auth")


class BackendSession:
    """Holds a cached JWT for the service admin and refreshes it when needed."""

    def __init__(self) -> None:
        self._token: str | None = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def token(self, client: httpx.AsyncClient) -> str:
        """Return a valid bearer token, logging in if necessary."""
        # Refresh 60s before declared expiry.
        if self._token and time.time() < self._expires_at - 60:
            return self._token
        async with self._lock:
            if self._token and time.time() < self._expires_at - 60:
                return self._token
            await self._login(client)
            assert self._token is not None
            return self._token

    async def invalidate(self) -> None:
        async with self._lock:
            self._token = None
            self._expires_at = 0.0

    async def _login(self, client: httpx.AsyncClient) -> None:
        if not settings.admin_email or not settings.admin_password:
            raise RuntimeError(
                "ADMIN_EMAIL / ADMIN_PASSWORD not configured for the gateway."
            )
        # SurfSense /auth/jwt/login is OAuth2-password style.
        resp = await client.post(
            f"{settings.backend_url}/auth/jwt/login",
            data={
                "username": settings.admin_email,
                "password": settings.admin_password,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30.0,
        )
        if resp.status_code >= 400:
            log.error("backend admin login failed: %s %s", resp.status_code, resp.text[:200])
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gateway cannot authenticate against the notelm backend.",
            )
        body = resp.json()
        self._token = body.get("access_token") or body.get("token")
        if not self._token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Backend login did not return an access token.",
            )
        # Assume 24h lifetime unless backend says otherwise.
        self._expires_at = time.time() + 23 * 3600
        log.info("notelm-gateway logged into backend as %s", settings.admin_email)


backend_session = BackendSession()


async def require_api_key(
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> str:
    """
    Accepts either `Authorization: Bearer <key>` or `X-API-Key: <key>`.
    Returns the friendly consumer name (e.g. 'taxlegal').
    """
    candidate: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        candidate = authorization[7:].strip()
    elif x_api_key:
        candidate = x_api_key.strip()

    if not candidate or candidate not in settings.api_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return settings.api_keys[candidate]


ApiKey = Depends(require_api_key)
