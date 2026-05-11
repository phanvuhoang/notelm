# notelm branding overlay

The upstream Next.js frontend already supports:

- runtime-injected env (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_PRIMARY_COLOR`,
  `NEXT_PUBLIC_DEFAULT_LOCALE`)
- multi-locale with `messages/vi.json` style files (en/es/hi/pt/zh ship by default).

We avoid forking the frontend image. To rebrand we use **two non-invasive paths**:

1. **Env-driven** — already wired in `coolify/docker-compose.yml`:
   - `NEXT_PUBLIC_APP_NAME=notelm`
   - `NEXT_PUBLIC_PRIMARY_COLOR=#028a39`
   - `NEXT_PUBLIC_DEFAULT_LOCALE=vi`
2. **Reverse-proxy CSS injection** — see `branding/notelm.css` below. Mount this
   via Coolify's "Custom CSS" / Traefik middleware (or via a tiny Caddy sidecar
   if your Coolify install doesn't have a CSS injector).

If upstream ever lacks one of the env knobs, switching to a real fork is one
line in `coolify/docker-compose.yml` (replace `image:` with `build:`).
