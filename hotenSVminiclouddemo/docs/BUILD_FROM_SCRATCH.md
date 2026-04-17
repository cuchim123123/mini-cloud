# MyMiniCloud — Build From Scratch Guide

Tài liệu này hướng dẫn dựng lại toàn bộ project `MyMiniCloud` từ số 0 trên Windows + Docker Desktop.
Nó bám theo rubric trong `instructions.txt` và phản ánh đúng cấu trúc hiện tại của repo `hotenSVminiclouddemo`.

---

## 1) Mục tiêu project

Xây dựng một hệ thống cloud mô phỏng gồm 9 loại server chạy trong các container riêng, dùng chung network `cloud-net`:

1. Web Server
2. Application Server
3. Database Server
4. Authentication Server
5. Object Storage Server
6. DNS / Name Service
7. Monitoring Server
8. Grafana / Visualization Server
9. Reverse Proxy / Load Balancer

Ngoài phần core, project này còn có các phần mở rộng:

- Blog cho web frontend
- API `/hello`, `/student`, `/students-db`
- Keycloak realm/user/client
- MinIO bucket + file upload
- DNS nội bộ cho các service
- Prometheus target `web`
- Grafana dashboard
- Load balancing 2 web server

---

## 2) Yêu cầu môi trường

Cài sẵn:

- Docker Desktop
- PowerShell 5.1 hoặc PowerShell 7
- Tùy chọn: WSL2 nếu muốn dùng lệnh Linux

Kiểm tra Docker:

```powershell
docker version
docker compose version
```

Nếu cổng `8080` bị chiếm bởi Apache/XAMPP, tắt service đó trước khi chạy.

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
Get-Process -Id <PID>
```

---

## 3) Cấu trúc thư mục

Tạo thư mục gốc:

```powershell
Set-Location "D:\mini-cloud\mini-cloud"
New-Item -ItemType Directory -Force hotenSVminiclouddemo | Out-Null
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
```

Cấu trúc mục tiêu:

```text
hotenSVminiclouddemo/
  docker-compose.yml
  web-frontend-server/
  application-backend-server/
  relational-database-server/
  authentication-identity-server/
  object-storage-server/
  internal-dns-server/
  monitoring-prometheus-server/
  monitoring-grafana-dashboard-server/
  api-gateway-proxy-server/
  docs/
```

---

## 4) Dựng từng server
    
### 4.1 Web Server

Mục tiêu: serve home page và blog.

Tạo file `web-frontend-server/src/App.jsx`, `web-frontend-server/nginx.conf`, `web-frontend-server/Dockerfile`, `web-frontend-server/metrics.prom`.

Điểm chính:

- Frontend dùng React/Vite
- Nginx serve app build
- `/blog` có route riêng
- `/metrics` trả metric text cho Prometheus

Build image:

```powershell
Push-Location .\web-frontend-server
npm install
npm run build
Pop-Location
```

---

### 4.2 Application Server

Mục tiêu: API backend xử lý `/hello`, `/student`, `/students-db`.

Tạo file chính:

- `application-backend-server/src/main.ts`
- `application-backend-server/src/app.controller.ts`
- `application-backend-server/src/app.service.ts`
- `application-backend-server/src/postgres.service.ts`
- `application-backend-server/package.json`
- `application-backend-server/Dockerfile`

Điểm chính:

- listen ở port `8081` trong container
- expose ra host port `8085`
- query PostgreSQL qua `pg`

Build:

```powershell
Push-Location .\application-backend-server
npm install
npm run build
Pop-Location
```

---

### 4.3 Database Server

Mục tiêu: tự seed data lần đầu.

Trong repo hiện tại dùng PostgreSQL.

Tạo init scripts:

- `relational-database-server/init/001_minicloud.sql`
- `relational-database-server/init/002_studentdb.sql`

Nội dung nên có:

- database `minicloud`
- bảng `notes`
- database `studentdb`
- bảng `students`
- seed data mẫu

Lưu ý:

- Volume phải bền dữ liệu: `postgres-data`
- Expose port `5432`

---

### 4.4 Authentication Server

Mục tiêu: Keycloak chạy được, có realm/user/client.

File cần có:

- `authentication-identity-server/import/realm_sv001-realm.json`
- `authentication-identity-server/bootstrap-keycloak.py`

Cấu hình chạy trong `docker-compose.yml`:

- image: `quay.io/keycloak/keycloak:latest`
- command: `start-dev --import-realm`
- admin bootstrap: `admin/admin`

Mục tiêu verify:

- realm `realm_sv001`
- users `sv01`, `sv02`
- client `flask-app`

---

### 4.5 Object Storage Server

Mục tiêu: MinIO console + upload file.

Tạo:

- `object-storage-server/data/`

Thông tin:

- console: `http://localhost:9001`
- credentials: `minioadmin/minioadmin`
- buckets cần có:
  - `profile-pics`
  - `documents`

---

### 4.6 DNS / Name Service

Mục tiêu: BIND9 phân giải tên nội bộ.

File cấu hình:

- `internal-dns-server/named.conf`
- `internal-dns-server/named.conf.options`
- `internal-dns-server/named.conf.local`
- `internal-dns-server/db.cloud.local`

Bản ghi nên có:

- `web-frontend-server.cloud.local`
- `application-backend.cloud.local`
- `object-storage.cloud.local`
- `authentication-identity.cloud.local`
- alias nội bộ cho các service khác nếu cần

Verify:

```powershell
docker exec internal-dns-server sh -lc 'dig @127.0.0.1 web-frontend-server.cloud.local +short'
```

---

### 4.7 Monitoring Server

Mục tiêu: Prometheus scrape Node Exporter và web target.

File:

- `monitoring-prometheus-server/prometheus.yml`

Có ít nhất 2 job:

- `node`
- `web`

Verify:

- `http://localhost:9090/-/healthy`
- `http://localhost:9090/targets`
- `web` target phải `UP`

---

### 4.8 Grafana / Visualization Server

Mục tiêu: có datasource + dashboard từ Prometheus.

File provisioning:

- `monitoring-grafana-dashboard-server/provisioning/datasources/prometheus.yml`
- `monitoring-grafana-dashboard-server/provisioning/dashboards/dashboards.yml`
- `monitoring-grafana-dashboard-server/provisioning/dashboards/system-health.json`
- `monitoring-grafana-dashboard-server/bootstrap-grafana.py`

Verify:

- `http://localhost:3000/api/health`
- dashboard `System Health of SV_ID`

---

### 4.9 Reverse Proxy / Load Balancer

Mục tiêu: Nginx route và cân bằng tải.

File:

- `api-gateway-proxy-server/nginx.conf`

Nên có:

- upstream `web_backend` gồm 2 web server
- route `/` tới frontend
- route `/api/` tới backend
- route `/auth/` tới Keycloak
- route `/student/` tới backend student API

---

## 5) docker-compose.yml

File trung tâm: `hotenSVminiclouddemo/docker-compose.yml`

Yêu cầu tối thiểu:

- tất cả services join cùng network `cloud-net`
- mỗi service có `container_name`
- exposed port hợp lý
- `restart: unless-stopped`
- mount volume khi cần lưu dữ liệu
- build custom images cho web/app

Chạy stack:

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
docker compose up -d --build
```

Xem trạng thái:

```powershell
docker compose ps
```

---

## 6) Cách verify sau khi chạy

### 6.1 Web

```powershell
(Invoke-WebRequest -Uri http://localhost:8080/ -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri http://localhost:8080/blog/ -UseBasicParsing).StatusCode
```

### 6.2 Backend

```powershell
Invoke-RestMethod -Uri http://localhost:8085/hello
Invoke-RestMethod -Uri http://localhost/api/hello
Invoke-RestMethod -Uri http://localhost/api/student
Invoke-RestMethod -Uri http://localhost/api/students-db
```

### 6.3 Database

```powershell
docker exec relational-database-server psql -U postgres -d minicloud -c "SELECT * FROM notes;"
docker exec relational-database-server psql -U postgres -d studentdb -c "SELECT * FROM students;"
```

### 6.4 Keycloak

```powershell
$body = @{ grant_type='password'; client_id='admin-cli'; username='admin'; password='admin' }
Invoke-RestMethod -Method Post -Uri 'http://localhost:8081/realms/master/protocol/openid-connect/token' -Body $body -ContentType 'application/x-www-form-urlencoded'
```

### 6.5 MinIO

```powershell
Invoke-WebRequest -Uri http://localhost:9001 -UseBasicParsing
```

### 6.6 DNS

```powershell
docker exec internal-dns-server sh -lc 'dig @127.0.0.1 web-frontend-server.cloud.local +short'
```

### 6.7 Prometheus

```powershell
Invoke-RestMethod -Uri http://localhost:9090/api/v1/targets
```

### 6.8 Grafana

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/health
```

### 6.9 Proxy / Load Balancer

```powershell
(Invoke-WebRequest -Uri http://localhost/ -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri http://localhost/student/ -UseBasicParsing).StatusCode
```

---

## 7) Checklist theo rubric

### Core 9 servers

- [ ] Web Server
- [ ] Application Server
- [ ] Database Server
- [ ] Authentication Server
- [ ] Object Storage
- [ ] DNS
- [ ] Monitoring
- [ ] Grafana
- [ ] Reverse Proxy / Load Balancer

### Extension / demo items

- [ ] Blog page
- [ ] `/student` route
- [ ] `studentdb` dataset
- [ ] Keycloak realm + users + client
- [ ] MinIO file upload
- [ ] DNS records cho internal services
- [ ] Prometheus `web` target `UP`
- [ ] Grafana dashboard
- [ ] Round-robin 2 web servers

---

## 8) Troubleshooting nhanh

### Port 8080 bị chiếm

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

### Container cũ cần recreate

```powershell
docker compose up -d --force-recreate internal-dns-server monitoring-prometheus-server monitoring-grafana-dashboard-server authentication-identity-server
```

### Xem logs

```powershell
docker compose logs -f monitoring-prometheus-server
docker compose logs -f authentication-identity-server
```

### Dừng toàn bộ

```powershell
docker compose down
```

---

## 9) Cách trình bày báo cáo cuối kỳ

Nên có các phần:

1. **Giới thiệu & mục tiêu**
2. **Kiến trúc & sơ đồ**
3. **Cấu hình & Dockerfile**
4. **Demo & kiểm thử**
5. **Đánh giá & phân tích**
6. **Phụ lục**

Các ảnh chụp nên gồm:

- `docker compose ps`
- `http://localhost:8080`
- `/blog`
- backend API JSON
- DB query result
- Keycloak console
- MinIO buckets/files
- DNS query output
- Prometheus targets
- Grafana dashboard
- Nginx upstream / proxy route

---

## 10) Ghi chú cuối

- Guide này được viết theo **cách làm từ đầu** nhưng bám đúng project hiện tại trong repo.
- Nếu bạn dựng lại theo hướng khác (Flask backend, MySQL, v.v.) thì vẫn giữ nguyên 9 server và quy trình verify tương tự.
- Mấu chốt để chấm điểm là: **container chạy thật, service thật, kiểm thử thật**.
