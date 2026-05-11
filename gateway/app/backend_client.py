"""Thin async client over the upstream SurfSense backend.

The gateway speaks **stable verbs** that we control; this module is the only
place that knows the underlying SurfSense route shape.  When SurfSense changes,
only this file changes — sister apps don't.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from .auth import backend_session
from .config import settings

log = logging.getLogger("notelm.backend")


class BackendClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.backend_url,
            timeout=httpx.Timeout(120.0, connect=10.0),
            follow_redirects=True,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _headers(self) -> dict[str, str]:
        token = await backend_session.token(self._client)
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: dict[str, Any] | None = None,
        files: Any = None,
        data: Any = None,
        retry_on_401: bool = True,
    ) -> httpx.Response:
        headers = await self._headers()
        resp = await self._client.request(
            method, path, headers=headers, json=json, params=params, files=files, data=data
        )
        if resp.status_code == 401 and retry_on_401:
            log.warning("backend 401 — refreshing admin token and retrying")
            await backend_session.invalidate()
            return await self._request(
                method, path, json=json, params=params, files=files, data=data,
                retry_on_401=False,
            )
        return resp

    @staticmethod
    def _raise_for_status(resp: httpx.Response) -> None:
        if resp.status_code < 400:
            return
        try:
            body = resp.json()
            msg = body.get("error", {}).get("message") or body.get("detail") or resp.text
        except Exception:
            msg = resp.text[:500]
        raise HTTPException(
            status_code=resp.status_code if resp.status_code >= 400 else 502,
            detail=msg or "backend error",
        )

    # ----- High-level verbs the gateway exposes -----

    async def create_notebook(self, name: str, description: str | None = None) -> dict:
        # SurfSense calls notebooks "search spaces".
        resp = await self._request(
            "POST",
            "/api/v1/searchspaces/",
            json={"name": name, "description": description or ""},
        )
        self._raise_for_status(resp)
        return resp.json()

    async def list_notebooks(self) -> list[dict]:
        resp = await self._request("GET", "/api/v1/searchspaces/")
        self._raise_for_status(resp)
        body = resp.json()
        return body if isinstance(body, list) else body.get("data", [])

    async def upload_source(
        self, notebook_id: int | str, filename: str, content: bytes, content_type: str
    ) -> dict:
        # Upstream endpoint accepts multipart upload tied to a search space.
        files = {"files": (filename, content, content_type or "application/octet-stream")}
        data = {"search_space_id": str(notebook_id)}
        resp = await self._request(
            "POST", "/api/v1/documents/upload", files=files, data=data
        )
        self._raise_for_status(resp)
        return resp.json()

    async def register_url_source(self, notebook_id: int | str, url: str) -> dict:
        resp = await self._request(
            "POST",
            "/api/v1/documents/from-url",
            json={"search_space_id": notebook_id, "url": url},
        )
        self._raise_for_status(resp)
        return resp.json()

    async def list_sources(self, notebook_id: int | str) -> list[dict]:
        resp = await self._request(
            "GET", "/api/v1/documents/", params={"search_space_id": notebook_id}
        )
        self._raise_for_status(resp)
        body = resp.json()
        return body if isinstance(body, list) else body.get("data", [])

    async def chat(
        self,
        notebook_id: int | str,
        question: str,
        model: str | None = None,
        history: list[dict] | None = None,
    ) -> dict:
        payload: dict[str, Any] = {
            "search_space_id": notebook_id,
            "messages": (history or []) + [{"role": "user", "content": question}],
        }
        if model:
            payload["model"] = model
        resp = await self._request("POST", "/api/v1/new-chat/messages", json=payload)
        self._raise_for_status(resp)
        return resp.json()

    async def summary(self, notebook_id: int | str, instructions: str | None = None) -> dict:
        payload = {"search_space_id": notebook_id}
        if instructions:
            payload["instructions"] = instructions
        resp = await self._request("POST", "/api/v1/notes/summary", json=payload)
        self._raise_for_status(resp)
        return resp.json()

    async def start_mindmap(self, notebook_id: int | str, prompt: str | None = None) -> dict:
        payload = {"search_space_id": notebook_id, "prompt": prompt or ""}
        resp = await self._request("POST", "/api/v1/mindmaps/", json=payload)
        self._raise_for_status(resp)
        return resp.json()

    async def start_podcast(
        self,
        notebook_id: int | str,
        title: str | None = None,
        language: str = "vi",
        voices: list[str] | None = None,
    ) -> dict:
        payload: dict[str, Any] = {
            "search_space_id": notebook_id,
            "title": title or "",
            "language": language,
        }
        if voices:
            payload["voices"] = voices
        resp = await self._request("POST", "/api/v1/podcasts/", json=payload)
        self._raise_for_status(resp)
        return resp.json()

    async def start_slides(
        self, notebook_id: int | str, title: str | None = None, theme: str | None = None
    ) -> dict:
        payload: dict[str, Any] = {"search_space_id": notebook_id, "title": title or ""}
        if theme:
            payload["theme"] = theme
        resp = await self._request("POST", "/api/v1/presentations/", json=payload)
        self._raise_for_status(resp)
        return resp.json()

    async def job_status(self, job_id: str) -> dict:
        # SurfSense exposes task status under /api/v1/tasks/{id}; if not present,
        # callers can poll the resource itself (e.g. /podcasts/{id}).
        for path in (
            f"/api/v1/tasks/{job_id}",
            f"/api/v1/podcasts/{job_id}",
            f"/api/v1/mindmaps/{job_id}",
            f"/api/v1/presentations/{job_id}",
        ):
            resp = await self._request("GET", path)
            if resp.status_code == 404:
                continue
            self._raise_for_status(resp)
            return resp.json()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found.",
        )


backend = BackendClient()
