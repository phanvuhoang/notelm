"""notelm-gateway — FastAPI app exposing /api/v1 for sister apps."""
from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .auth import ApiKey
from .backend_client import backend
from .config import settings

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("notelm.gw")


# --- Rate limit (very simple in-memory sliding window per API-key name) ---
_HITS: dict[str, deque[float]] = defaultdict(deque)


def _check_rate_limit(consumer: str) -> None:
    now = time.time()
    window = _HITS[consumer]
    while window and now - window[0] > 60.0:
        window.popleft()
    if len(window) >= settings.rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded ({settings.rate_limit_per_minute}/min).",
        )
    window.append(now)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("notelm-gateway starting; backend=%s consumers=%s",
             settings.backend_url, list(settings.api_keys.values()))
    yield
    await backend.aclose()


app = FastAPI(
    title="notelm — Public API",
    version="1.0.0",
    description=(
        "Stable API for sister apps (taxlegal, testsgen, ...) to drive a notelm "
        "instance. Auth: `Authorization: Bearer <NOTELM_API_KEY>` or `X-API-Key: ...`."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod via reverse proxy if needed
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Envelope helpers ---

def _envelope(data: Any, request_id: str) -> dict:
    return {"ok": True, "data": data, "request_id": request_id}


def _error(status_code: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "ok": False,
            "error": {"code": code, "message": message},
            "request_id": request_id,
        },
    )


@app.middleware("http")
async def request_id_mw(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


@app.exception_handler(HTTPException)
async def http_exc_handler(request: Request, exc: HTTPException):
    rid = getattr(request.state, "request_id", "")
    code = {
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        429: "RATE_LIMITED",
        502: "BACKEND_ERROR",
    }.get(exc.status_code, "ERROR")
    return _error(exc.status_code, code, str(exc.detail), rid)


# --- Health ---

@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"ok": True, "service": "notelm-gateway", "version": app.version}


# --- Schemas ---

class NotebookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class UrlSource(BaseModel):
    url: str


class ChatRequest(BaseModel):
    question: str
    model: str | None = None
    history: list[dict] | None = None


class SummaryRequest(BaseModel):
    instructions: str | None = None


class MindmapRequest(BaseModel):
    prompt: str | None = None


class PodcastRequest(BaseModel):
    title: str | None = None
    language: str = "vi"
    voices: list[str] | None = None


class SlidesRequest(BaseModel):
    title: str | None = None
    theme: str | None = None


# --- Routes ---

@app.get("/api/v1/me")
async def me(request: Request, consumer: str = ApiKey):
    return _envelope({"consumer": consumer}, request.state.request_id)


@app.post("/api/v1/notebooks", status_code=201)
async def create_notebook(body: NotebookCreate, request: Request, consumer: str = ApiKey):
    _check_rate_limit(consumer)
    data = await backend.create_notebook(body.name, body.description)
    return _envelope(data, request.state.request_id)


@app.get("/api/v1/notebooks")
async def list_notebooks(request: Request, consumer: str = ApiKey):
    _check_rate_limit(consumer)
    data = await backend.list_notebooks()
    return _envelope(data, request.state.request_id)


@app.post("/api/v1/notebooks/{notebook_id}/sources", status_code=201)
async def upload_source(
    notebook_id: str,
    request: Request,
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
    consumer: str = ApiKey,
):
    _check_rate_limit(consumer)
    if file is not None:
        content = await file.read()
        data = await backend.upload_source(
            notebook_id, file.filename or "upload.bin", content,
            file.content_type or "application/octet-stream",
        )
    elif url:
        data = await backend.register_url_source(notebook_id, url)
    else:
        raise HTTPException(400, "Provide either a `file` upload or a `url` field.")
    return _envelope(data, request.state.request_id)


@app.get("/api/v1/notebooks/{notebook_id}/sources")
async def list_sources(notebook_id: str, request: Request, consumer: str = ApiKey):
    _check_rate_limit(consumer)
    data = await backend.list_sources(notebook_id)
    return _envelope(data, request.state.request_id)


@app.post("/api/v1/notebooks/{notebook_id}/chat")
async def chat(
    notebook_id: str, body: ChatRequest, request: Request, consumer: str = ApiKey
):
    _check_rate_limit(consumer)
    data = await backend.chat(notebook_id, body.question, model=body.model, history=body.history)
    return _envelope(data, request.state.request_id)


@app.post("/api/v1/notebooks/{notebook_id}/summary")
async def summary(
    notebook_id: str, body: SummaryRequest, request: Request, consumer: str = ApiKey
):
    _check_rate_limit(consumer)
    data = await backend.summary(notebook_id, body.instructions)
    return _envelope(data, request.state.request_id)


@app.post("/api/v1/notebooks/{notebook_id}/mindmap", status_code=202)
async def mindmap(
    notebook_id: str, body: MindmapRequest, request: Request, consumer: str = ApiKey
):
    _check_rate_limit(consumer)
    data = await backend.start_mindmap(notebook_id, body.prompt)
    return _envelope(data, request.state.request_id)


@app.post("/api/v1/notebooks/{notebook_id}/podcast", status_code=202)
async def podcast(
    notebook_id: str, body: PodcastRequest, request: Request, consumer: str = ApiKey
):
    _check_rate_limit(consumer)
    data = await backend.start_podcast(
        notebook_id, title=body.title, language=body.language, voices=body.voices
    )
    return _envelope(data, request.state.request_id)


@app.post("/api/v1/notebooks/{notebook_id}/slides", status_code=202)
async def slides(
    notebook_id: str, body: SlidesRequest, request: Request, consumer: str = ApiKey
):
    _check_rate_limit(consumer)
    data = await backend.start_slides(notebook_id, title=body.title, theme=body.theme)
    return _envelope(data, request.state.request_id)


@app.get("/api/v1/jobs/{job_id}")
async def job_status(job_id: str, request: Request, consumer: str = ApiKey):
    _check_rate_limit(consumer)
    data = await backend.job_status(job_id)
    return _envelope(data, request.state.request_id)
