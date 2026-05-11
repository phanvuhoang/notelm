# API integration — `taxlegal`, `testsgen`, …

Public, stable API surface served by `notelm-gateway` at
`https://gw.notelm.gpt4vn.com/api/v1/...`.

## Auth

Each consumer app gets its own API key (env `NOTELM_API_KEYS` is a comma-list
of `name:key` pairs). Send it as **either** of:

```
Authorization: Bearer <NOTELM_API_KEY>
X-API-Key: <NOTELM_API_KEY>
```

## Response envelope

Success:

```json
{ "ok": true, "data": { ... }, "request_id": "req_a1b2c3d4e5f6" }
```

Error:

```json
{ "ok": false, "error": { "code": "BACKEND_ERROR", "message": "..." }, "request_id": "..." }
```

Common error codes: `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, `BACKEND_ERROR`.

## Endpoints

### Create a notebook

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks \
  -H "Authorization: Bearer $NOTELM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"VN tax updates Q2 2026","description":"For taxlegal app"}'
```

### Upload a source (file)

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/sources \
  -H "Authorization: Bearer $NOTELM_API_KEY" \
  -F "file=@./circular-78.pdf"
```

### Register a source (URL)

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/sources \
  -H "Authorization: Bearer $NOTELM_API_KEY" \
  -F "url=https://thuvienphapluat.vn/..."
```

### Chat Q&A

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/chat \
  -H "Authorization: Bearer $NOTELM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "question":"Tóm tắt các thay đổi chính của Thông tư 78.",
    "model":"openrouter/deepseek/deepseek-chat"
  }'
```

Response (abbreviated):

```json
{ "ok": true, "data": {
   "message": { "role": "assistant", "content": "…" },
   "citations": [ { "source_id": 12, "chunk_id": 7, "quote": "…" } ]
}, "request_id":"..." }
```

### Summary

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/summary \
  -H "Authorization: Bearer $NOTELM_API_KEY" -H "Content-Type: application/json" \
  -d '{"instructions":"Trình bày dạng bullet points, dành cho luật sư."}'
```

### Mindmap (async)

```bash
JOB=$(curl -s -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/mindmap \
  -H "Authorization: Bearer $NOTELM_API_KEY" -H "Content-Type: application/json" \
  -d '{"prompt":"Mindmap các điều kiện ưu đãi thuế TNDN."}' | jq -r '.data.id')

# Poll
curl https://gw.notelm.gpt4vn.com/api/v1/jobs/$JOB \
  -H "Authorization: Bearer $NOTELM_API_KEY"
```

### Podcast (async)

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/podcast \
  -H "Authorization: Bearer $NOTELM_API_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Bản tin thuế tuần 19","language":"vi"}'
```

### Slides (async)

```bash
curl -X POST https://gw.notelm.gpt4vn.com/api/v1/notebooks/$NB/slides \
  -H "Authorization: Bearer $NOTELM_API_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Cập nhật thuế GTGT","theme":"corporate"}'
```

## Python SDK snippet (drop into taxlegal / testsgen)

```python
import httpx, os, time

NOTELM = httpx.Client(
    base_url=os.environ["NOTELM_URL"],         # e.g. https://gw.notelm.gpt4vn.com
    headers={"Authorization": f"Bearer {os.environ['NOTELM_API_KEY']}"},
    timeout=60.0,
)

def create_notebook(name: str) -> str:
    r = NOTELM.post("/api/v1/notebooks", json={"name": name})
    r.raise_for_status()
    return str(r.json()["data"]["id"])

def upload(nb: str, path: str) -> dict:
    with open(path, "rb") as f:
        r = NOTELM.post(f"/api/v1/notebooks/{nb}/sources",
                        files={"file": (os.path.basename(path), f)})
    r.raise_for_status()
    return r.json()["data"]

def ask(nb: str, question: str, model: str | None = None) -> dict:
    r = NOTELM.post(f"/api/v1/notebooks/{nb}/chat",
                    json={"question": question, "model": model})
    r.raise_for_status()
    return r.json()["data"]

def make_podcast(nb: str, title: str) -> str:
    r = NOTELM.post(f"/api/v1/notebooks/{nb}/podcast",
                    json={"title": title, "language": "vi"})
    r.raise_for_status()
    return r.json()["data"]["id"]

def wait_job(job_id: str, timeout: int = 600) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = NOTELM.get(f"/api/v1/jobs/{job_id}")
        r.raise_for_status()
        data = r.json()["data"]
        if data.get("status") in {"completed", "succeeded", "failed", "error"}:
            return data
        time.sleep(5)
    raise TimeoutError(f"Job {job_id} timed out")
```

## Rate limits

Default: **120 requests / minute / API key**. Override with
`RATE_LIMIT_PER_MINUTE` env on `notelm-gateway`. Polling `/jobs/{id}` counts —
keep your poll interval ≥ 3 s.

## Versioning

The path prefix `/api/v1/` is the version contract. Breaking changes ship as
`/api/v2/` in parallel. Internal SurfSense upgrades are absorbed by
`notelm-gateway` so consumer apps stay stable.

## OpenAPI

`https://gw.notelm.gpt4vn.com/docs` (Swagger UI) and `/openapi.json`.
