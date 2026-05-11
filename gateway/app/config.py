"""Runtime configuration for notelm-gateway."""
from __future__ import annotations

import os
from dataclasses import dataclass


def _parse_api_keys(raw: str) -> dict[str, str]:
    """
    Parse `NOTELM_API_KEYS` of the form  "name1:key1,name2:key2".
    Returns {key -> name} for O(1) lookup.
    """
    out: dict[str, str] = {}
    for chunk in (raw or "").split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if ":" in chunk:
            name, key = chunk.split(":", 1)
            name, key = name.strip(), key.strip()
        else:
            name, key = "anonymous", chunk
        if key:
            out[key] = name
    return out


@dataclass(frozen=True)
class Settings:
    backend_url: str
    admin_email: str
    admin_password: str
    api_keys: dict[str, str]
    log_level: str
    rate_limit_per_minute: int

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            backend_url=os.environ.get("BACKEND_URL", "http://backend:8000").rstrip("/"),
            admin_email=os.environ.get("ADMIN_EMAIL", "").strip().lower(),
            admin_password=os.environ.get("ADMIN_PASSWORD", ""),
            api_keys=_parse_api_keys(os.environ.get("NOTELM_API_KEYS", "")),
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
            rate_limit_per_minute=int(os.environ.get("RATE_LIMIT_PER_MINUTE", "120")),
        )


settings = Settings.from_env()
