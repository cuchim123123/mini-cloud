# MyMiniCloud - Service Architecture, Purpose, and Flow

Tài liệu này mô tả **vai trò của từng service**, cách chúng **khởi động**, và **luồng tương tác** giữa chúng trong hệ thống MyMiniCloud.

> Ghi chú: trong project hiện tại có **2 web frontend container** (`web-frontend-server`, `web-frontend-server2`) để mô phỏng load balancing. Tuy nhiên về mặt kiến trúc, chúng cùng đóng vai trò **Web Server**.

---

## 1) Mục tiêu hệ thống

MyMiniCloud mô phỏng một cloud platform thu nhỏ gồm các thành phần cơ bản:
- **Web Server**: phục vụ giao diện người dùng
- **Application Server**: xử lý API và logic nghiệp vụ
- **Database Server**: lưu dữ liệu
- **Authentication Server**: cung cấp đăng nhập/token
- **Object Storage**: lưu file, ảnh, tài liệu
- **DNS Server**: phân giải tên nội bộ
- **Monitoring**: thu thập metric hệ thống
- **Grafana**: trực quan hóa dữ liệu
- **Reverse Proxy / Load Balancer**: điểm vào duy nhất cho người dùng

Tất cả service chạy chung trên `cloud-net` để gọi nhau bằng tên container thay vì IP cứng.

---

## 2) Danh sách service và vai trò

| Service | Vai trò | Port host | File/config quan trọng |
|---|---|---:|---|
| `web-frontend-server` | Web static/SPA, trang chủ và blog | `8080` | `web-frontend-server/Dockerfile`, `web-frontend-server/nginx.conf` |
| `web-frontend-server2` | Web replica để mô phỏng load balancing | `8088` | như trên |
| `application-backend-server` | API backend, đọc JSON/DB, xử lý logic | `8085` | `application-backend-server/Dockerfile`, `src/*.ts` |
| `relational-database-server` | PostgreSQL lưu dữ liệu `notes`, `studentdb.students` | `5432` | `relational-database-server/init/*.sql` |
| `authentication-identity-server` | Keycloak OIDC / login / token | `8081` | `authentication-identity-server/import/realm_sv001-realm.json` |
| `object-storage-server` | MinIO lưu object/bucket | `9000`, `9001` | `object-storage-server/data/` |
| `internal-dns-server` | Bind9 zone nội bộ `cloud.local` | `1053/udp` | `internal-dns-server/db.cloud.local` |
| `monitoring-node-exporter-server` | Xuất metric CPU/RAM/network của host/container | `9100` | image chính thức |
| `monitoring-prometheus-server` | Scrape metric từ Node Exporter và web metrics | `9090` | `monitoring-prometheus-server/prometheus.yml` |
| `monitoring-grafana-dashboard-server` | Dashboard metric, trực quan hóa | `3000` | `monitoring-grafana-dashboard-server/provisioning/*` |
| `api-gateway-proxy-server` | Reverse proxy / routing / load balancing | `80` | `api-gateway-proxy-server/nginx.conf` |

---

## 3) Ý nghĩa từng service

### 3.1 Web Server

**Mục đích**
- Phục vụ giao diện tĩnh hoặc frontend app.
- Mô phỏng web hosting trong cloud.
- Hỗ trợ kiểm thử route `/`, `/blog/`, và API path khi truy cập qua Nginx.

**Hiện tại trong project**
- Có 2 container giống nhau:
  - `web-frontend-server` → `localhost:8080`
  - `web-frontend-server2` → `localhost:8088`
- API Gateway dùng 2 container này để mô phỏng load balancing round-robin.

**Kiểm thử nhanh**
```powershell
curl -I http://localhost:8080/
curl -I http://localhost:8080/blog/
```

---

### 3.2 Application Server

**Mục đích**
- Xử lý API logic.
- Trả JSON cho frontend hoặc qua gateway.
- Kết nối database.
- Kết nối Keycloak để xác thực OIDC.

**Endpoint chính**
- `GET /hello` → trả message chào mừng
- `GET /student` → trả danh sách sinh viên từ file JSON
- `GET /students-db` → đọc dữ liệu từ PostgreSQL
- `GET /platform/summary` → tổng hợp trạng thái service

**File quan trọng**
- `src/app.controller.ts`
- `src/platform.controller.ts`
- `src/platform.service.ts`
- `src/postgres.service.ts`
- `src/app.module.ts`

**Kiểm thử nhanh**
```powershell
curl http://localhost:8085/hello
curl http://localhost/api/hello
curl http://localhost/api/student
curl http://localhost/api/students-db
```

---

### 3.3 Database Server

**Mục đích**
- Lưu dữ liệu bền vững.
- Mô phỏng RDS / relational database trong cloud.

**Trong project**
- Dùng PostgreSQL.
- Volume `postgres-data` giữ dữ liệu qua restart.
- Init SQL tự chạy lần đầu trong `relational-database-server/init/`.

**Database logic**
- Database `minicloud`: lưu các bản ghi notes.
- Database `studentdb`: lưu bảng students.

**Kiểm thử nhanh**
```powershell
docker exec -it relational-database-server psql -U postgres -d minicloud -c "SELECT * FROM notes;"
docker exec -it relational-database-server psql -U postgres -d studentdb -c "SELECT * FROM students;"
```

---

### 3.4 Authentication Server

**Mục đích**
- Quản lý user, login, token.
- Cung cấp OIDC / SSO.
- Bảo vệ các route cần xác thực.

**Trong project**
- Dùng Keycloak.
- Realm `realm_sv001` được import tự động.
- Bootstrap script đảm bảo client `nestjs` tồn tại và client cũ `flask-app` bị xóa.

**File quan trọng**
- `authentication-identity-server/import/realm_sv001-realm.json`
- `authentication-identity-server/bootstrap-keycloak.py`
- `docker-compose.yml` phần service Keycloak + bootstrap

**Kiểm thử nhanh**
```powershell
curl -i http://localhost:8081/
curl -i http://localhost:8081/realms/sv001-realm/.well-known/openid-configuration
```

---

### 3.5 Object Storage Server

**Mục đích**
- Lưu file, ảnh, report, PDF.
- Mô phỏng S3/object storage.

**Trong project**
- MinIO chạy với `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`.
- Data được mount vào `object-storage-server/data`.
- Console chạy ở port `9001`.

**Kiểm thử nhanh**
```powershell
curl -i http://localhost:9000/minio/health/live
curl -i http://localhost:9001/
```

---

### 3.6 DNS Server

**Mục đích**
- Phân giải tên miền nội bộ cho các container.
- Mô phỏng service discovery trong private network.

**Zone**
- Zone: `cloud.local`
- File zone: `internal-dns-server/db.cloud.local`

**Ví dụ bản ghi**
- `web-frontend-server.cloud.local` → `10.10.10.10`
- `app-backend.cloud.local` → `10.10.10.20`
- `minio.cloud.local` → `10.10.10.30`
- `keycloak.cloud.local` → `10.10.10.40`

**Kiểm thử nhanh**
```powershell
docker run --rm --network cloud-net alpine:3.20 sh -lc 'apk add --no-cache bind-tools >/dev/null 2>&1; dig +short @internal-dns-server -p 53 web-frontend-server.cloud.local'
```

---

### 3.7 Monitoring Server

**Mục đích**
- Thu thập metric từ container/host.
- Kiểm tra trạng thái target `UP/DOWN`.

**Trong project**
- `monitoring-node-exporter-server` xuất metric.
- Prometheus scrape Node Exporter + web metrics.

**Kiểm thử nhanh**
```powershell
curl -i http://localhost:9090/-/healthy
```

---

### 3.8 Grafana Dashboard Server

**Mục đích**
- Trực quan hóa metric từ Prometheus.
- Hiển thị dashboard health/system metrics.

**Trong project**
- Grafana có bootstrap script tự import dashboard `system-health.json`.
- Datasource trỏ tới Prometheus container.

**Kiểm thử nhanh**
```powershell
curl -i http://localhost:3000/api/health
```

---

### 3.9 Reverse Proxy / Load Balancer

**Mục đích**
- Là cổng vào duy nhất cho người dùng.
- Route request đến web/app/auth.
- Cân bằng tải cho 2 web container.

**Route hiện tại**
- `/` → `web_backend` (2 web servers)
- `/api/` → backend
- `/auth/` → Keycloak
- `/student/` → endpoint student của backend

**File quan trọng**
- `api-gateway-proxy-server/nginx.conf`

**Kiểm thử nhanh**
```powershell
curl -I http://localhost/
curl -i http://localhost/api/hello
curl -i http://localhost/auth/
curl -i http://localhost/student/
```

---

## 4) Luồng request / pipeline

### 4.1 Luồng người dùng web

```text
Browser
  -> api-gateway-proxy-server (Nginx)
    -> web-frontend-server / web-frontend-server2
      -> HTML/CSS/JS trả về browser
```

### 4.2 Luồng API

```text
Browser / Frontend
  -> api-gateway-proxy-server
    -> application-backend-server
      -> PostgreSQL / Keycloak / MinIO / DNS (nếu cần)
      -> JSON response
```

### 4.3 Luồng xác thực

```text
Frontend / Browser
  -> api-gateway-proxy-server / auth route
    -> authentication-identity-server (Keycloak)
      -> token / login / OIDC config
```

### 4.4 Luồng monitoring

```text
Prometheus
  -> scrape monitoring-node-exporter-server
  -> scrape web frontend metrics
  -> lưu time-series data
Grafana
  -> đọc data từ Prometheus
  -> hiển thị dashboard
```

### 4.5 Luồng DNS nội bộ

```text
Container A
  -> query internal-dns-server
  -> resolve cloud.local names
  -> connect tới service bằng hostname nội bộ
```

---

## 5) Thứ tự khởi động hợp lý

Thứ tự đề xuất:
1. `relational-database-server`
2. `authentication-identity-server`
3. `object-storage-server`
4. `internal-dns-server`
5. `monitoring-node-exporter-server`
6. `monitoring-prometheus-server`
7. `monitoring-grafana-dashboard-server`
8. `application-backend-server`
9. `web-frontend-server` và `web-frontend-server2`
10. `api-gateway-proxy-server`

Lý do:
- Backend cần DB / auth sẵn sàng.
- Bootstrap Keycloak và Grafana cần services tương ứng up trước.
- Proxy nên chạy sau để route tới các service đã sẵn sàng.

---

## 6) Các file cấu hình ảnh hưởng trực tiếp đến flow

- `docker-compose.yml` → khai báo network, ports, volumes, depends_on
- `api-gateway-proxy-server/nginx.conf` → reverse proxy và load balancing
- `monitoring-prometheus-server/prometheus.yml` → scrape targets
- `internal-dns-server/db.cloud.local` → mapping hostname nội bộ
- `authentication-identity-server/bootstrap-keycloak.py` → import / reconcile realm + client
- `monitoring-grafana-dashboard-server/bootstrap-grafana.py` → import dashboard tự động
- `application-backend-server/src/*.ts` → business logic và API endpoints

---

## 7) Kết luận

MyMiniCloud hoạt động như một cloud platform thu nhỏ:
- User đi vào qua **proxy**
- **Web** phục vụ giao diện
- **Backend** xử lý logic và gọi DB/auth/storage
- **DNS** hỗ trợ service discovery
- **Prometheus + Grafana** theo dõi và hiển thị trạng thái hệ thống

Nếu cần, tài liệu tiếp theo nên là:
- sơ đồ kiến trúc bằng hình,
- checklist demo từng service,
- và checklist nộp báo cáo cuối kỳ.
