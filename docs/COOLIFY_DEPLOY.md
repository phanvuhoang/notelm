# Triển khai notelm trên Coolify VPS

Hướng dẫn step-by-step để deploy `notelm` lên Coolify, dùng sub-domain
`notelm.gpt4vn.com`. Áp dụng cho Coolify v4.

> ⚠️ **Bảo mật**: Trước khi bắt đầu, **đổi password Coolify** của bạn — nó đã
> bị lộ trong lịch sử chat khi tạo task này.

## 1. Chuẩn bị DNS

Trỏ các bản ghi A (hoặc CNAME) sau về IP VPS của bạn:

| Sub-domain                 | Trỏ tới VPS                      | Service đích          |
|----------------------------|----------------------------------|-----------------------|
| `notelm.gpt4vn.com`        | A record → IP Coolify VPS        | `frontend` :3000      |
| `api.notelm.gpt4vn.com`    | A record → IP Coolify VPS        | `backend` :8000       |
| `gw.notelm.gpt4vn.com`     | A record → IP Coolify VPS        | `notelm-gateway` :9000|

(Bạn có thể bỏ `api.` và để frontend tự gọi backend qua mạng nội bộ Docker,
nhưng để các app khác debug và dùng Swagger thì nên có.)

## 2. Tạo project trong Coolify

1. Đăng nhập Coolify → **Projects** → **+ New Project**, đặt tên `notelm`.
2. Trong project, **+ New Resource** → **Docker Compose Empty**.
3. Đặt tên service: `notelm`. Server: chọn VPS của bạn.

## 3. Paste compose & env

1. Mở `coolify/docker-compose.yml` trong repo này, **paste toàn bộ** vào tab
   **Configuration → Docker Compose** của Coolify.
2. Mở `coolify/.env.example`, **paste vào tab Environment Variables** và điền
   các giá trị `CHANGE_ME_*`:
   - `SECRET_KEY` → chạy `openssl rand -base64 32`
   - `DB_PASSWORD` → password mạnh
   - `ADMIN_EMAIL` → ví dụ `admin@gpt4vn.com`
   - `ADMIN_PASSWORD` → password mạnh ≥ 12 ký tự
   - `OPENROUTER_API_KEY` + `OPENAI_API_KEY` + `DEEPSEEK_API_KEY` → key thật
   - `NOTELM_API_KEYS` → ví dụ
     `taxlegal:$(openssl rand -hex 32),testsgen:$(openssl rand -hex 32)`
   - `SEARXNG_SECRET` → `openssl rand -base64 32`

   Lưu **toàn bộ giá trị API key thật** vào nơi bạn quản lý bí mật (1Password,
   Bitwarden…). Sau khi paste vào Coolify thì chúng đã được mã hoá.

## 4. Mount file seed_admin.py

Coolify hỗ trợ **Storage → Persistent volumes** và **Files**. Có 2 cách:

- **Cách A (đề xuất)**: trong Coolify → **Storages → Files**, tạo file
  `seed_admin.py` với nội dung từ `coolify/seed_admin.py`, mount path
  `/app/seed_admin.py` cho service `init-admin`.
- **Cách B**: dùng `git clone` trong build phase, nhưng `init-admin` chỉ dùng
  image dựng sẵn nên Cách A đơn giản hơn.

## 5. Gán domain & SSL

Trong tab **Domains** của Coolify:

| Service          | Domain                       | Port | HTTPS                  |
|------------------|------------------------------|------|------------------------|
| `frontend`       | `notelm.gpt4vn.com`          | 3000 | ✅ Let's Encrypt (auto) |
| `backend`        | `api.notelm.gpt4vn.com`      | 8000 | ✅                      |
| `notelm-gateway` | `gw.notelm.gpt4vn.com`       | 9000 | ✅                      |

## 6. Deploy

Bấm **Deploy**. Lần đầu sẽ mất 5–15 phút (kéo image, chạy migration Alembic,
tải embedding model nếu dùng local).

Kiểm tra:

```bash
curl https://api.notelm.gpt4vn.com/health
curl https://gw.notelm.gpt4vn.com/healthz
curl https://notelm.gpt4vn.com/        # nên trả HTML
```

## 7. Đăng nhập lần đầu

Mở `https://notelm.gpt4vn.com` → **Sign in** với `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. Service `init-admin` chạy 1 lần sau khi backend khoẻ, tạo
tài khoản này (idempotent — chạy lại không hỏng dữ liệu).

Sau khi vào được, đặt `REGISTRATION_ENABLED=FALSE` (nếu chưa) và redeploy để
khoá đăng ký công khai.

## 8. Cấu hình AI model trong UI

Vào **Settings → AI Models** trong notelm UI và đặt model cho:

- Chat / Q&A (đề xuất: `openrouter/openai/gpt-4o-mini` hoặc
  `openrouter/deepseek/deepseek-chat` cho VN-friendly chi phí thấp)
- Long-context / báo cáo (đề xuất: `openrouter/google/gemini-2.0-flash-001`)
- Embedding (đề xuất: local `all-MiniLM-L6-v2` — free, không cần key)
- TTS podcast (mặc định: `local/kokoro` — free)

Bạn cũng có thể dán key OpenAI / DeepSeek / Google trực tiếp trong UI
"BYOK" của notelm thay vì để ở env.

## 9. Tài nguyên đề xuất

| RAM tối thiểu | RAM khuyến nghị | CPU | Đĩa  |
|---------------|------------------|-----|------|
| 6 GB          | 8–12 GB          | 2   | 30 GB|

`docker stats` để theo dõi, `backend` ăn nhiều nhất khi indexing PDF lớn.

## 10. Backup

Volume cần backup là `notelm-postgres`. Trong Coolify → **Backups**, bật
backup hàng ngày cho service `db` (Coolify dùng pg_dump tự động).

## 11. Cập nhật

```bash
# Bump SURFSENSE_VERSION trong env nếu muốn pin
SURFSENSE_VERSION=0.0.15
# rồi bấm Redeploy trong Coolify.
```
