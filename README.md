# notelm — NotebookLM-style AI workspace for Coolify VPS

`notelm` is a **production-friendly Coolify distribution + public API gateway** built on top of
[SurfSense-NotebookLM](https://github.com/phanvuhoang/SurfSense-NotebookLM).

> Why a fork instead of a rewrite?
> SurfSense is a ~1,000-file Python backend + 700-file Next.js app with 54 routes, 66 services,
> Celery workers, pgvector, real-time sync (Zero), Docling parsing, Kokoro TTS and a full agent
> graph. Rewriting it loses years of work for no benefit. `notelm` instead **reuses the upstream
> prebuilt Docker images** (`ghcr.io/modsetter/surfsense-*`) and adds:
>
> 1. A **Coolify-ready `docker-compose.yml`** tuned for a single VPS (no Kubernetes).
> 2. An **admin auto-seed** init container so the app is usable immediately after deploy.
> 3. A new **`notelm-gateway`** service exposing a clean, stable, API-key-protected
>    `/api/v1/...` surface for sister apps (`taxlegal`, `testsgen`, …).
> 4. A **UI branding overlay** (primary `#028a39`, Vietnamese strings) injected via env + a
>    small custom Tailwind theme — no fork of the Next.js app required.
> 5. Vietnamese / English docs for deploy and integration.

## TL;DR — Deploy on Coolify

```bash
# In Coolify dashboard:
# 1. New Resource → Docker Compose → paste contents of coolify/docker-compose.yml
# 2. Environment Variables → paste contents of coolify/.env.example, fill required values
# 3. Domain → notelm.gpt4vn.com  → service: frontend  (port 3000)
# 4. Domain → api.notelm.gpt4vn.com → service: backend (port 8000)   [optional]
# 5. Domain → gw.notelm.gpt4vn.com  → service: notelm-gateway (port 9000) [for taxlegal/testsgen]
# 6. Deploy.
```

After deploy, log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (set in env).
See [`docs/COOLIFY_DEPLOY.md`](docs/COOLIFY_DEPLOY.md) for the long-form walkthrough.

## Services (5 containers, 1 optional)

| Service           | Image                                              | Role                                    |
|-------------------|----------------------------------------------------|-----------------------------------------|
| `db`              | `pgvector/pgvector:pg17`                           | Postgres + pgvector                     |
| `redis`           | `redis:8-alpine`                                   | Celery broker + cache                   |
| `backend`         | `ghcr.io/modsetter/surfsense-backend:latest`       | FastAPI core (NotebookLM features)      |
| `worker`          | same image, `SERVICE_ROLE=worker`                  | Celery worker (podcast, indexing)       |
| `frontend`        | `ghcr.io/modsetter/surfsense-web:latest`           | Next.js UI                              |
| `notelm-gateway`  | built locally from `gateway/`                      | **Public API v1 for sister apps**       |
| `searxng`         | `searxng/searxng:2026.3.13-3c1f68c59` *(optional)* | Bundled web search                      |

We **drop** `zero-cache` and `celery_beat` from the upstream compose to fit a small VPS — the app
runs fine without them for self-hosted single-tenant use (real-time sync gracefully falls back
to standard REST/polling, and scheduled connector sync isn't relevant when you mostly upload PDFs).

## Capabilities preserved from upstream

- Multi-source notebooks (PDF, DOCX, TXT, MD, audio, video, web URLs)
- Chat Q&A with citations across sources
- Mindmap generation
- Audio podcast generation (Kokoro local TTS by default)
- Slide / presentation generation
- Summaries, research notes, action items
- Multi-provider AI (OpenAI, OpenRouter, Google, DeepSeek, Anthropic, Cohere, …) via LiteLLM
- Embedding choice (local MiniLM by default; OpenAI/Cohere via env)
- File parsing via Docling (local, default), Unstructured, or LlamaCloud

## New in notelm

- **`/api/v1` public API** (in `gateway/`) — stable surface for `taxlegal` / `testsgen`:
  - `POST /api/v1/notebooks` — create a notebook
  - `POST /api/v1/notebooks/{id}/sources` — upload/register a source
  - `POST /api/v1/notebooks/{id}/chat` — Q&A (sync, streamed)
  - `POST /api/v1/notebooks/{id}/summary` — generate summary
  - `POST /api/v1/notebooks/{id}/mindmap` — generate mindmap (async job)
  - `POST /api/v1/notebooks/{id}/podcast` — generate podcast (async job)
  - `POST /api/v1/notebooks/{id}/slides` — generate slides (async job)
  - `GET  /api/v1/jobs/{job_id}` — job status
  - All endpoints take `Authorization: Bearer <NOTELM_API_KEY>`.
  - See [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md).

## License & upstream credit

This distribution is licensed Apache-2.0, same as the upstream project.
All NotebookLM-like capability comes from [SurfSense-NotebookLM](https://github.com/phanvuhoang/SurfSense-NotebookLM)
by the SurfSense authors — please star and support the upstream repo.
