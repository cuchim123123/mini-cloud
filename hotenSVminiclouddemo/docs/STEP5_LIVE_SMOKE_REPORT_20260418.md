# Step 5 Live Smoke Report (2026-04-18)

## Scope

Mục tiêu Step 5:
- chạy smoke test blog/admin trên môi trường đang chạy thực tế,
- xác nhận luồng protected endpoint hoạt động end-to-end,
- ghi nhận các điều chỉnh runtime cần thiết để pass xác thực JWT.

Script sử dụng:
- `scripts/smoke-blog-admin.ps1`

---

## Pre-check

Đã khởi động/rebuild lại services cần thiết:

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
docker compose up -d
docker compose up -d --build application-backend-server web-frontend-server web-frontend-server2 api-gateway-proxy-server
```

---

## Root-cause found during live run

Trong quá trình live smoke, protected endpoint trả `401 JWT issuer mismatch`.

### Observed mismatch

- Token issuer ban đầu: `http://localhost:8081/realms/realm_sv001`
- Backend expected issuer: `http://authentication-identity-server:8080/realms/realm_sv001`

Ngoài ra token service-account ban đầu có `aud: account`, cần thêm `myapp` để khớp `OIDC_AUDIENCE=myapp`.

---

## Runtime fixes applied (no source-file change)

1. Dùng Keycloak admin API để đảm bảo role `admin` đã gán cho service account client `smoke-ci`.
2. Thêm audience protocol mapper `aud-myapp` cho client `smoke-ci`.
3. Cập nhật realm attribute `frontendUrl` thành:
   - `http://authentication-identity-server:8080/`

Sau đó token mới có:
- `iss: http://authentication-identity-server:8080/realms/realm_sv001`
- `aud: ["myapp", "account"]`
- `realm_access.roles` có `admin`

---

## Live smoke execution

Command chạy thực tế:

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
# token được mint từ Keycloak realm bằng client_credentials của smoke-ci
.\scripts\smoke-blog-admin.ps1 -BaseUrl "http://localhost" -Token $token
```

### Result

- `[PASS] Posts list reachable`
- `[PASS] upload-url endpoint returned signed URL`
- `[PASS] Created post`
- `[PASS] Updated post`
- `[PASS] Deleted post`
- `[PASS] Final list check passed`
- `Smoke script completed successfully.`

---

## Outcome

Step 5 live smoke đã **PASS end-to-end**.

Blog/admin flow (protected + public) hoạt động đầy đủ trong môi trường compose hiện tại khi issuer/audience/role đồng bộ.

---

## Notes for repeatability

Nếu chạy lại từ environment mới:
- đảm bảo token có `iss` khớp `KEYCLOAK_ISSUER_URL`,
- đảm bảo token có audience `myapp`,
- đảm bảo principal có role `admin`.

Nếu không, smoke script sẽ fail tại bước protected endpoints (`upload-url`, `POST/PUT/DELETE /posts`).
