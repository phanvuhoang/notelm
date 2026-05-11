# notelm-gateway

A thin FastAPI service that exposes a **stable `/api/v1/...` surface** with simple
**API-key auth** to sister apps (`taxlegal`, `testsgen`, …).

## Why a separate service?

The upstream SurfSense FastAPI backend uses **per-user JWTs from `fastapi-users`** —
fine for a logged-in human, but awkward for machine-to-machine integrations:

- Tokens expire (sister apps would need refresh logic).
- The route shape is internal and may change between SurfSense releases.
- Routes are scoped to a single user; sister apps want a shared notebook.

`notelm-gateway` solves this:

1. Accepts `Authorization: Bearer <NOTELM_API_KEY>` from `NOTELM_API_KEYS`.
2. Internally logs into the backend as the **service admin** (`ADMIN_EMAIL`/`ADMIN_PASSWORD`)
   and caches the JWT, refreshing on 401.
3. Maps stable public verbs (`create_notebook`, `chat`, `summary`, `mindmap`,
   `podcast`, `slides`, `job_status`) onto the upstream endpoints.
4. Adds basic per-key rate limiting and request logging.

## Endpoints (v1)

| Method & path                                | Purpose                              |
|----------------------------------------------|--------------------------------------|
| `GET  /healthz`                              | Liveness                             |
| `GET  /api/v1/me`                            | Identity / debug                     |
| `POST /api/v1/notebooks`                     | Create a notebook                    |
| `GET  /api/v1/notebooks`                     | List notebooks                       |
| `POST /api/v1/notebooks/{id}/sources`        | Upload/register a source             |
| `GET  /api/v1/notebooks/{id}/sources`        | List sources                         |
| `POST /api/v1/notebooks/{id}/chat`           | Q&A (streamed SSE if `stream=true`)  |
| `POST /api/v1/notebooks/{id}/summary`        | Summary                              |
| `POST /api/v1/notebooks/{id}/mindmap`        | Mindmap (async job)                  |
| `POST /api/v1/notebooks/{id}/podcast`        | Podcast audio (async job)            |
| `POST /api/v1/notebooks/{id}/slides`         | Slide deck (async job)               |
| `GET  /api/v1/jobs/{job_id}`                 | Job status & result                  |

All endpoints return JSON with the envelope:

```json
{ "ok": true, "data": { ... }, "request_id": "..." }
```

or, on error:

```json
{ "ok": false, "error": { "code": "...", "message": "..." }, "request_id": "..." }
```
