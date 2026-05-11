"""
notelm — admin user auto-seed.

Run inside the SurfSense backend image (it already has all deps loaded).
Idempotent: if a user with ADMIN_EMAIL exists, we leave it alone but ensure
`is_superuser=True` and `is_verified=True`.
"""
from __future__ import annotations

import asyncio
import contextlib
import os
import sys

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip().lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    print("[seed_admin] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping.", flush=True)
    sys.exit(0)


async def main() -> None:
    from fastapi_users.password import PasswordHelper  # type: ignore
    from sqlalchemy import select, update

    from app.db import User, async_session_maker  # type: ignore

    helper = PasswordHelper()
    hashed = helper.hash(ADMIN_PASSWORD)

    async with async_session_maker() as session:
        existing = (
            await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        ).scalar_one_or_none()

        if existing is None:
            user = User(
                email=ADMIN_EMAIL,
                hashed_password=hashed,
                is_active=True,
                is_superuser=True,
                is_verified=True,
            )
            session.add(user)
            await session.commit()
            print(f"[seed_admin] created admin {ADMIN_EMAIL}", flush=True)
        else:
            await session.execute(
                update(User)
                .where(User.id == existing.id)
                .values(
                    is_active=True,
                    is_superuser=True,
                    is_verified=True,
                    hashed_password=hashed,  # re-sync password to env
                )
            )
            await session.commit()
            print(
                f"[seed_admin] admin {ADMIN_EMAIL} already exists — ensured "
                f"superuser=True, password re-synced from env.",
                flush=True,
            )


if __name__ == "__main__":
    with contextlib.suppress(SystemExit):
        asyncio.run(main())
