# MyMiniCloud - Dockerize the Whole App from Scratch

Tài liệu này mô tả cách biến một hệ thống **9 service raw** thành một project Docker hoàn chỉnh, giả sử ban đầu bạn **chưa có Docker file, chưa có Compose, chưa có network, chưa có bootstrap script**.

Mục tiêu là sau khi hoàn thành:
- Mỗi service chạy trong **container riêng**
- Tất cả service dùng chung **`cloud-net`**
- Có **ports hợp lý** để test từ host
- Có **volume** để giữ dữ liệu
- Có **restart policy** để tự phục hồi
- Có **reverse proxy** làm điểm vào duy nhất
- Có **init scripts** để DB / Keycloak / Grafana tự cấu hình

---

## 1) Giả định đầu vào

Bạn đã có 9 service raw chạy được độc lập theo kiểu:
- Web frontend
- Application backend
- Relational database
- Authentication server
- Object storage
- DNS server
- Node exporter / monitoring agent
- Prometheus
- Grafana
- Reverse proxy

Nhưng chúng vẫn chạy kiểu local, chưa container hóa.

---

## 2) Mục tiêu Dockerization

Chuyển từ:
- **app chạy rời rạc trên máy**

sang:
- **container hóa từng service**
- **giao tiếp nội bộ qua Docker network**
- **truy cập từ host qua cổng map**
- **có file cấu hình rõ ràng, build lại được**

---

## 3) Thiết kế thư mục chuẩn

Một cấu trúc tối thiểu nên như sau:

```text
hotenSVminiclouddemo/
  docker-compose.yml
  web-frontend-server/
    Dockerfile
    nginx.conf
    src/...
  application-backend-server/
    Dockerfile
    package.json
    tsconfig.json
    src/...
  relational-database-server/
    init/
      001_minicloud.sql
      002_studentdb.sql
  authentication-identity-server/
    bootstrap-keycloak.py
    import/
      realm_sv001-realm.json
  object-storage-server/
    data/
  internal-dns-server/
    named.conf
    named.conf.options
    named.conf.local
    db.cloud.local
  monitoring-prometheus-server/
    prometheus.yml
  monitoring-grafana-dashboard-server/
    bootstrap-grafana.py
    provisioning/
      dashboards/
      datasources/
  api-gateway-proxy-server/
    nginx.conf
```

---

## 4) Cách nghĩ khi dockerize từng service

### 4.1 Web frontend

**Mục tiêu**
- Build UI một lần
- Serve bằng Nginx
- Không cần runtime Node trong production image

**File cần có**
- `Dockerfile`
- `nginx.conf`
- static assets / source code frontend

**Image flow**
1. `node` build source
2. `nginx` serve `dist/`

**Ví dụ file chính**
- `web-frontend-server/Dockerfile`
- `web-frontend-server/nginx.conf`

**Port**
- Container: `80`
- Host: `8080`

---

### 4.2 Application backend

**Mục tiêu**
- Đóng gói API thành một image có thể chạy ở mọi máy
- Dùng env vars để trỏ DB / auth / storage

**File cần có**
- `Dockerfile`
- `package.json`
- source code backend

**Docker strategy**
- Build bằng Node (hoặc Python/Java tuỳ stack)
- Runtime image gọn nhẹ
- Expose nội bộ `8081`

**Trong project hiện tại**
- Backend là NestJS/Node.
- Image dùng multi-stage build.

**Port**
- Container: `8081`
- Host: `8085`

---

### 4.3 Database

**Mục tiêu**
- Tạo DB bền vững
- Tự chạy script tạo schema / seed data lúc lần đầu

**File cần có**
- `init/*.sql`
- volume data

**Cách hoạt động**
- Khi container DB start lần đầu, entrypoint của image sẽ tự chạy script trong `/docker-entrypoint-initdb.d/`
- Dữ liệu được giữ trong volume nên restart không mất

**Port**
- Container: `5432` (PostgreSQL)
- Host: `5432`

---

### 4.4 Authentication server

**Mục tiêu**
- Có IdP/SSO
- Tự import realm
- Có bootstrap script xử lý client/user sau khi server sẵn sàng

**File cần có**
- `import/realm_sv001-realm.json`
- `bootstrap-keycloak.py`
- `docker-compose.yml` service Keycloak + bootstrap job

**Cách hoạt động**
1. Keycloak start trước
2. Bootstrap script chờ Keycloak ready
3. Script import realm nếu chưa có
4. Script xoá client cũ, tạo client mới đúng tên

**Port**
- Container: `8080`
- Host: `8081`

---

### 4.5 Object storage

**Mục tiêu**
- Có nơi lưu file upload, ảnh, PDF, assets
- Giữ dữ liệu qua restart

**File cần có**
- volume mount tới `data/`

**Port**
- API: `9000`
- Console: `9001`

---

### 4.6 DNS server

**Mục tiêu**
- Có tên nội bộ cho service discovery
- Service nào cũng gọi nhau bằng hostname ổn định

**File cần có**
- `named.conf`
- `named.conf.options`
- `named.conf.local`
- `db.cloud.local`

**Ý nghĩa**
- `db.cloud.local` là zone map hostname → IP nội bộ
- Khi thêm service mới, chỉ thêm record vào zone file

**Port**
- `1053/udp` trên host
- DNS container dùng port `53/udp`

---

### 4.7 Monitoring

**Mục tiêu**
- Có metric scrape được
- Có target `UP`
- Có dashboard để nhìn tổng quan

**File cần có**
- `monitoring-prometheus-server/prometheus.yml`
- `monitoring-grafana-dashboard-server/bootstrap-grafana.py`
- `monitoring-grafana-dashboard-server/provisioning/*`

**Luồng**
- Node Exporter xuất metric
- Prometheus scrape metric
- Grafana đọc data từ Prometheus

---

### 4.8 Reverse proxy / gateway

**Mục tiêu**
- Một entry point duy nhất cho user
- Route request theo path
- Có thể load balance nhiều web container

**File cần có**
- `api-gateway-proxy-server/nginx.conf`

**Luồng**
- `/` → web frontend
- `/api/` → backend
- `/auth/` → Keycloak
- `/student/` → backend student API

---

## 5) Các bước init setup từ zero

### Bước 1: Tạo folder project

```bash
mkdir -p hotenSVminiclouddemo/{web-frontend-server,application-backend-server,relational-database-server,authentication-identity-server,object-storage-server,internal-dns-server,monitoring-prometheus-server,monitoring-grafana-dashboard-server,api-gateway-proxy-server}
cd hotenSVminiclouddemo
```

### Bước 2: Viết web frontend và backend trước

Làm theo thứ tự:
1. tạo source code
2. tạo Dockerfile
3. build từng service riêng
4. test từng service bằng cổng riêng

Lý do:
- dễ debug
- giảm phụ thuộc chéo
- kiểm tra API sớm

### Bước 3: Tạo database + init SQL

- Viết SQL tạo schema
- Viết seed data
- Mount vào init folder của image DB

### Bước 4: Tạo auth server + bootstrap

- Import realm
- Tạo client đúng tên
- Kiểm thử token endpoint

### Bước 5: Tạo object storage

- Mount volume data
- Đặt credentials trong env
- Kiểm thử console + health

### Bước 6: Tạo DNS server

- Viết zone file
- Add alias cho service
- Test bằng `dig`

### Bước 7: Tạo monitoring

- Prometheus scrape Node Exporter + web metrics
- Grafana import dashboard qua bootstrap

### Bước 8: Tạo gateway / reverse proxy

- Định nghĩa upstream
- Proxy path `/api`, `/auth`
- Balance web frontend bằng 2 container

### Bước 9: Gom vào `docker-compose.yml`

- khai báo network chung
- khai báo ports
- khai báo volumes
- khai báo depends_on
- thêm restart policy

---

## 6) Dockerfile phải chứa gì

### 6.1 Web frontend Dockerfile

Nên có:
- stage build bằng Node
- stage runtime bằng Nginx
- copy config Nginx
- copy build output

Mẫu flow:
```text
source -> npm build -> dist/ -> nginx serve
```

---

### 6.2 Backend Dockerfile

Nên có:
- base image cho build
- copy source code
- cài dependencies
- expose port nội bộ
- runtime command

Mẫu flow:
```text
source -> install deps -> build -> run server
```

---

### 6.3 DB / Keycloak / MinIO / Prometheus / Grafana

Các service này có thể:
- dùng image có sẵn
- chỉ cần volume/config/bootstrap file
- không nhất thiết viết Dockerfile custom nếu image chính thức đủ dùng

Nhưng vẫn phải có:
- mount config
- mount data
- env vars
- entrypoint/command phù hợp

---

## 7) `docker-compose.yml` phải làm gì

`docker-compose.yml` là trung tâm ghép mọi thứ lại với nhau.

Nó cần:
- tạo network `cloud-net`
- map port host
- mount volume
- trỏ config file vào container
- đặt `container_name`
- đặt `restart: unless-stopped`
- khai báo `depends_on`

### Tại sao `depends_on` không đủ?
- `depends_on` chỉ đảm bảo **start order**, không đảm bảo service đã **ready**.
- Vì vậy các bootstrap script (Keycloak/Grafana) phải tự chờ service sẵn sàng.

---

## 8) Cách các service chạy với nhau

### 8.1 Qua Docker network

Trong cùng `cloud-net`, container gọi nhau bằng:
- `application-backend-server`
- `relational-database-server`
- `authentication-identity-server`
- `object-storage-server`
- `internal-dns-server`
- `monitoring-prometheus-server`
- `monitoring-grafana-dashboard-server`

### 8.2 Qua env vars

Backend cần biết:
- `DATABASE_URL`
- `STUDENT_DATABASE_URL`
- `OIDC_AUDIENCE`

### 8.3 Qua reverse proxy

User chỉ cần nhớ:
- `http://localhost/`
- `http://localhost/api/...`
- `http://localhost/auth/`

Không cần nhớ từng container internal port.

---

## 9) Luồng khởi động khuyến nghị

1. Tạo network và volume
2. Start DB
3. Start auth/storage/DNS/monitoring
4. Start backend
5. Start frontend replicas
6. Start gateway
7. Chạy bootstrap jobs
8. Verify health endpoints

Ví dụ lệnh:

```powershell
docker compose build --no-cache
docker compose up -d
docker compose ps
```

---

## 10) Checklist debug khi service chưa nói chuyện được

### Nếu backend không gọi DB được
- kiểm tra `DATABASE_URL`
- kiểm tra DB container up chưa
- kiểm tra schema init đã chạy chưa

### Nếu Keycloak bootstrap fail
- check admin credentials
- check realm JSON path
- check script có chờ đủ lâu không

### Nếu Grafana dashboard không xuất hiện
- check datasource Prometheus
- check bootstrap script đã chạy
- check dashboard JSON trong `provisioning`

### Nếu DNS không resolve
- check zone file
- check `named.conf.local`
- check `dig` có trỏ đúng server không

### Nếu proxy trả HTML thay vì JSON
- check route `/api/` có proxy tới backend không
- check `rewrite` / `proxy_pass`
- check Nginx config đã reload chưa

---

## 11) Mapping file → trách nhiệm

| File | Trách nhiệm |
|---|---|
| `docker-compose.yml` | ghép toàn bộ hệ thống |
| `web-frontend-server/Dockerfile` | build + serve UI |
| `web-frontend-server/nginx.conf` | route web frontend |
| `application-backend-server/Dockerfile` | build backend |
| `application-backend-server/src/*` | API/logic |
| `relational-database-server/init/*.sql` | seed DB |
| `authentication-identity-server/bootstrap-keycloak.py` | reconcile realm/client |
| `monitoring-grafana-dashboard-server/bootstrap-grafana.py` | auto import dashboard |
| `monitoring-prometheus-server/prometheus.yml` | scrape targets |
| `internal-dns-server/db.cloud.local` | hostname map |
| `api-gateway-proxy-server/nginx.conf` | reverse proxy / load balance |

---

## 12) Kết luận

Dockerizing MyMiniCloud từ zero là quá trình:
1. chuẩn hóa từng service,
2. đóng gói vào container,
3. kết nối bằng network chung,
4. tự động hóa init/bootstrap,
5. test qua proxy và public ports.

Nếu làm đúng, bạn sẽ có một hệ thống có thể:
- build lại từ đầu,
- chạy nhất quán trên máy local,
- và dễ mang sang EC2 hoặc môi trường khác.
