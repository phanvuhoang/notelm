#!/usr/bin/env bash
# Smoke test for a deployed notelm.
# Usage:
#   NOTELM_URL=https://gw.notelm.gpt4vn.com NOTELM_API_KEY=... ./scripts/smoke_test.sh
set -euo pipefail

: "${NOTELM_URL:?set NOTELM_URL e.g. https://gw.notelm.gpt4vn.com}"
: "${NOTELM_API_KEY:?set NOTELM_API_KEY}"

H="Authorization: Bearer ${NOTELM_API_KEY}"

echo "→ healthz"
curl -fsS "${NOTELM_URL}/healthz" | jq .

echo "→ me"
curl -fsS -H "$H" "${NOTELM_URL}/api/v1/me" | jq .

echo "→ create notebook"
NB_JSON=$(curl -fsS -X POST -H "$H" -H "Content-Type: application/json" \
  -d '{"name":"smoke-test","description":"created by smoke_test.sh"}' \
  "${NOTELM_URL}/api/v1/notebooks")
echo "$NB_JSON" | jq .
NB=$(echo "$NB_JSON" | jq -r '.data.id')

echo "→ list notebooks"
curl -fsS -H "$H" "${NOTELM_URL}/api/v1/notebooks" | jq '.data[0:3]'

echo "→ register url source"
curl -fsS -X POST -H "$H" -F "url=https://en.wikipedia.org/wiki/Vietnam" \
  "${NOTELM_URL}/api/v1/notebooks/${NB}/sources" | jq .

echo "→ chat (may take ~10–30s on first call)"
curl -fsS -X POST -H "$H" -H "Content-Type: application/json" \
  -d '{"question":"In one sentence, what is the capital of Vietnam?"}' \
  "${NOTELM_URL}/api/v1/notebooks/${NB}/chat" | jq '.data.message // .data'

echo "✓ smoke test done"
