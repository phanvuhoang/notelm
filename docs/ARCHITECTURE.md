# notelm — architecture

```
                              Internet
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
        notelm.gpt4vn.com  api.notelm.gpt4vn.com  gw.notelm.gpt4vn.com
                  │              │              │
              (Traefik / Coolify reverse proxy)
                  │              │              │
            ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼─────────┐
            │ frontend  │  │  backend  │  │ notelm-gateway│
            │ Next.js   │  │ FastAPI   │  │ FastAPI v1   │
            └─────┬─────┘  └──┬───┬──┬─┘  └──────┬───────┘
                  │           │   │  │           │
                  └────┐ ┌────┘   │  │           │
                       │ │        │  └─ login as ADMIN_EMAIL,
                       ▼ ▼        │     cache JWT, refresh on 401
                ┌──────────────┐  │
                │ Postgres +   │◄─┘
                │  pgvector    │
                └──────────────┘
                       ▲
                       │
                ┌──────┴───────┐    ┌──────────┐
                │   Redis      │◄───┤  worker  │ (Celery: indexing,
                │ (Celery+app) │    │          │  podcast, mindmap,
                └──────────────┘    └──────────┘  slides)

                ┌──────────────┐
                │  SearXNG     │  ← used by chat tool "web search"
                └──────────────┘
```

## Services & responsibilities

| Service          | Why                                                                |
|------------------|--------------------------------------------------------------------|
| `db`             | Postgres + pgvector — relational data, chunks, embeddings.         |
| `redis`          | Celery broker, app cache, rate-limit counters.                     |
| `backend`        | FastAPI app from upstream SurfSense — owns all domain logic.       |
| `worker`         | Celery worker — heavy/async jobs (indexing, TTS, slide rendering). |
| `frontend`       | Next.js UI — same image as upstream, env-themed for notelm.        |
| `notelm-gateway` | **New.** Stable `/api/v1/...` for sister apps + API-key auth.       |
| `searxng`        | Federated web search used by chat agent (optional).                |
| `init-admin`     | One-shot — seeds the admin from env, exits.                        |

## What we cut vs upstream

- **`zero-cache`** — Rocicorp real-time sync. Saves ~700 MB RAM. UI falls
  back to REST + intervals — fine for single-tenant self-hosted.
- **`celery_beat`** — periodic connector polling. Not needed when sources are
  uploads, not OAuth-synced calendars/inboxes.
- **`flower`** — not enabled in upstream either (commented out).

If you later need real-time multi-user collab, re-enable `zero-cache` from the
upstream compose and add it to `coolify/docker-compose.yml`.

## Why a gateway instead of exposing backend directly?

| Problem                                          | Gateway fix                                |
|--------------------------------------------------|--------------------------------------------|
| Backend uses per-user JWT with expiry            | Gateway logs in as admin and caches token  |
| Upstream route shape may change                  | Verbs translated in `backend_client.py`    |
| Sister apps want stable verbs (chat/mindmap/…)   | Public `/api/v1/` is small + frozen        |
| Need per-app keys + rate limit + audit           | Implemented in gateway middleware          |
| OpenAPI bloat from 54 internal routes            | Gateway publishes only 10 clean endpoints  |

## Tradeoffs we accepted

1. **No rewrite of backend.** SurfSense is a 1000-file codebase under active
   development. Forking and divergent-maintaining it for a single VPS is bad
   ROI. We reuse upstream images + a thin layer.
2. **Brand overlay vs UI fork.** We use env-driven theming + a small CSS
   override. If you ever want a deeply custom UI, you'd fork `surfsense_web`
   and replace the `image:` line with `build:` in compose.
3. **Single-VPS scoping.** Compose, healthchecks, memory limits and the
   choice to drop `zero-cache`/`celery_beat` all assume one machine. Adding a
   second worker node only requires duplicating the `worker` service.
4. **Gateway acts as service admin.** Sister apps don't get per-user identity
   — every call is "the notelm service account". Use one notebook per app or
   per project to keep data clean.
