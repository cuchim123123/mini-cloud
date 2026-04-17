# Blog/Admin Smoke Test

Tài liệu này mô tả cách chạy smoke test tự động cho luồng blog admin:
- probe list post công khai,
- probe endpoint cấp `upload-url` (auth),
- tạo post,
- cập nhật post,
- xoá post,
- kiểm tra lại list.

## 1) Yêu cầu trước khi chạy

- Stack đã chạy (`docker compose up -d`).
- Có token Keycloak hợp lệ với role admin.
- Chạy trên PowerShell (Windows).

## 2) Script

File script:
- `scripts/smoke-blog-admin.ps1`

## 3) Chạy dry-run (không gọi API)

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
.\scripts\smoke-blog-admin.ps1 -DryRun
```

## 4) Chạy thật với token admin

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
$token = "<KEYCLOAK_ACCESS_TOKEN>"
.\scripts\smoke-blog-admin.ps1 -BaseUrl "http://localhost" -Token $token
```

Nếu muốn bỏ qua bước probe upload-url:

```powershell
.\scripts\smoke-blog-admin.ps1 -BaseUrl "http://localhost" -Token $token -SkipUploadProbe
```

## 5) Kỳ vọng kết quả

Script in theo từng bước với prefix:
- `[STEP]` cho bước đang chạy,
- `[PASS]` khi bước thành công,
- `Smoke script completed successfully.` khi toàn bộ flow qua.

## 6) Lưu ý

- Script tự chấp nhận token có hoặc không có prefix `Bearer `.
- Nếu token hết hạn/sai role, các bước admin sẽ fail với `401/403`.
- Nếu hệ thống có data lớn, bước verify cuối chỉ kiểm trong page đầu (`page=1, limit=3`).
