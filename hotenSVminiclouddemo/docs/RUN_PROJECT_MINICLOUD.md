# Hướng dẫn chạy project MyMiniCloud

Tài liệu này hướng dẫn chạy project từ đầu trên máy Windows + Docker Desktop + WSL.

## 1) Yêu cầu trước khi chạy

- Docker Desktop đã cài và đang chạy
- WSL hoạt động (Ubuntu hoặc distro bất kỳ)
- Mở terminal tại workspace:
  - `D:\mini-cloud\mini-cloud\hotenSVminiclouddemo`

---

## 2) Lưu ý quan trọng về cổng 8080 (xung đột Apache)

Nếu bạn mở `http://localhost:8080` mà ra app cũ không liên quan Docker, khả năng cao Windows Apache/XAMPP đang chiếm cổng.

Kiểm tra process giữ cổng 8080:

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
Get-Process -Id <PID>
```

Nếu là Apache/XAMPP, chạy PowerShell **Run as Administrator**:

```powershell
Stop-Service -Name Apache2.4 -Force
Set-Service -Name Apache2.4 -StartupType Manual
```

---

## 3) Chạy project (theo flow trong instructions)

## Bước 1: vào thư mục project

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
```

## Bước 2: dừng và xoá container cũ

```powershell
wsl -e bash -lc "docker ps -q | xargs -r docker stop"
wsl -e bash -lc "docker ps -aq | xargs -r docker rm -f"
wsl -e bash -lc "docker ps"
```

## Bước 3: build + up toàn bộ stack

```powershell
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose build --no-cache"
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose up -d"
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose ps"
```

---

## 4) Danh sách URL và tài khoản

- Frontend: `http://localhost:8080`
- Frontend 2 (load-balance): `http://localhost:8088`
- API direct: `http://localhost:8085`
- API gateway: `http://localhost`
- Keycloak: `http://localhost:8081` (`admin/admin`)
- MinIO Console: `http://localhost:9001` (`minioadmin/minioadmin`)
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (`admin/admin`)

---

## 5) Test nhanh sau khi chạy

## 5.1 Web + Blog

```powershell
(Invoke-WebRequest -Uri http://localhost:8080/ -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri http://localhost:8080/blog/ -UseBasicParsing).StatusCode
```

Kỳ vọng: `200`, `200`

## 5.2 API backend

```powershell
Invoke-RestMethod -Uri http://localhost:8085/hello
Invoke-RestMethod -Uri http://localhost/api/hello
Invoke-RestMethod -Uri http://localhost/api/student
Invoke-RestMethod -Uri http://localhost/api/students-db
```

## 5.3 Reverse proxy

```powershell
(Invoke-WebRequest -Uri http://localhost/ -UseBasicParsing).StatusCode
Invoke-RestMethod -Uri http://localhost/api/hello
(Invoke-WebRequest -Uri http://localhost/auth/ -MaximumRedirection 0 -ErrorAction SilentlyContinue).StatusCode
```

## 5.4 Database

```powershell
wsl -e bash -lc "docker exec relational-database-server psql -U postgres -d minicloud -c 'SELECT * FROM notes;'"
wsl -e bash -lc "docker exec relational-database-server psql -U postgres -d studentdb -c 'SELECT * FROM students;'"
```

## 5.5 Keycloak token test

```powershell
$body = @{ grant_type='password'; client_id='admin-cli'; username='admin'; password='admin' }
Invoke-RestMethod -Method Post -Uri 'http://localhost:8081/realms/master/protocol/openid-connect/token' -Body $body -ContentType 'application/x-www-form-urlencoded'
```

## 5.6 MinIO test

```powershell
wsl -e bash -lc "docker run --rm --network cloud-net -v /tmp/minio-test:/work -v /tmp/minio-test/.mc:/root/.mc minio/mc alias set local http://object-storage-server:9000 minioadmin minioadmin"
```

## 5.7 Prometheus + Grafana

```powershell
Invoke-RestMethod -Uri http://localhost:9090/api/v1/targets
Invoke-RestMethod -Uri http://localhost:3000/api/health
```

## 5.8 DNS nội bộ

```powershell
wsl -e bash -lc "dns_ip=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' internal-dns-server); docker run --rm --network cloud-net busybox nslookup web-frontend-server.cloud.local $dns_ip"
```

---

## 6) Lệnh vận hành thường dùng

Xem logs:

```powershell
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose logs -f application-backend-server"
```

Restart 1 service:

```powershell
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose restart api-gateway-proxy-server"
```

Recreate 1 service sau khi sửa config:

```powershell
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose up -d --force-recreate internal-dns-server"
```

Dừng toàn bộ stack:

```powershell
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose down"
```

---

## 7) Troubleshooting nhanh

## Lỗi: vào `localhost:8080` ra app cũ
- Nguyên nhân: cổng 8080 bị Apache/XAMPP giữ
- Cách xử lý: stop service Apache2.4 (Admin PowerShell)

## Lỗi: DNS không resolve
- Kiểm tra `internal-dns-server` có Up không
- Recreate DNS service:

```powershell
wsl -e bash -lc "cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo && docker compose up -d --force-recreate internal-dns-server"
```

## Lỗi: service Up nhưng API lỗi
- Xem logs service backend / db
- Test trực tiếp backend qua `:8085`
- Test qua gateway `:80` để xác định lỗi route hay lỗi app

---

## 8) Checklist hoàn thành demo

- [ ] `docker compose ps` thấy full services Up
- [ ] `http://localhost:8080` và `/blog` OK
- [ ] `http://localhost/api/hello` trả JSON đúng
- [ ] DB query được dữ liệu `notes` + `students`
- [ ] Keycloak login được
- [ ] MinIO tạo bucket + upload file được
- [ ] Prometheus target `UP`
- [ ] Grafana có datasource + dashboard
- [ ] Proxy route `/api/*`, `/auth/*`, `/student/*` hoạt động
- [ ] Ping nội bộ các service trong `cloud-net` thành công

Hoàn thành checklist này là bạn đã có thể demo đầy đủ theo yêu cầu bài.