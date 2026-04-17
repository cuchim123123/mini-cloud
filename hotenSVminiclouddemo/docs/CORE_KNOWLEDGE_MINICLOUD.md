# Tài liệu Core Knowledge cho Mini-Cloud Project

## 1) Bức tranh tổng quan hệ thống

Một project như `MyMiniCloud` mô phỏng 1 cloud platform thu nhỏ bằng nhiều container chạy chung mạng nội bộ.

Trong project này, các khối chính gồm:
- `web-frontend-server`: giao diện người dùng (React + Nginx)
- `application-backend-server`: API xử lý logic (NestJS)
- `relational-database-server`: lưu dữ liệu quan hệ (PostgreSQL)
- `authentication-identity-server`: xác thực/SSO (Keycloak)
- `object-storage-server`: lưu file dạng object (MinIO)
- `internal-dns-server`: DNS nội bộ (Bind9)
- `monitoring-prometheus-server` + `monitoring-node-exporter-server`: thu thập metrics
- `monitoring-grafana-dashboard-server`: trực quan hoá metrics
- `api-gateway-proxy-server`: cửa vào chung, reverse proxy/load balancing

---

## 2) Core Docker cần nắm

## 2.1 Image vs Container
- **Image**: “bản đóng gói” ứng dụng + runtime.
- **Container**: tiến trình đang chạy tạo từ image.

## 2.2 Dockerfile
Mỗi service custom thường có Dockerfile:
- Chọn base image (`node`, `nginx`, ...)
- Copy source/config
- Cài dependency
- Build
- Expose port
- Start command

## 2.3 Docker Compose
`docker-compose.yml` là nơi mô tả toàn bộ hệ thống:
- `services`: danh sách server
- `ports`: map cổng host ↔ container
- `volumes`: dữ liệu bền vững
- `networks`: giao tiếp nội bộ theo tên service
- `depends_on`: thứ tự khởi chạy tương đối

## 2.4 Network trong container
Các service nói chuyện với nhau qua **service name**:
- API gọi DB qua `relational-database-server:5432`
- Proxy gọi backend qua `application-backend-server:8081`

Không dùng `localhost` giữa các container (trừ khi gọi chính nó).

## 2.5 Volume
Volume giúp dữ liệu không mất khi container restart/recreate:
- DB data
- MinIO object data
- Config mount (Nginx, Prometheus, Bind9)

---

## 3) Reverse Proxy & API Gateway

`api-gateway-proxy-server` dùng Nginx để:
- route `/` tới frontend
- route `/api/` tới backend
- route `/auth/` tới Keycloak
- route `/student/` tới endpoint cụ thể

Lợi ích:
- Một cổng vào duy nhất (`:80`)
- Ẩn hạ tầng phía sau
- Dễ thêm auth/rate-limit/logging sau này

---

## 4) Load Balancing cơ bản

Nginx upstream + round robin:
- nhiều web server (`web-frontend-server`, `web-frontend-server2`)
- client vào 1 endpoint
- request được chia đều theo vòng

Khái niệm quan trọng:
- **upstream group**
- **health/retry** (nâng cao)
- sticky session (nâng cao)

---

## 5) Database core cần biết

Trong project này dùng PostgreSQL:
- init script tạo DB/table/data mẫu
- backend query dữ liệu qua driver `pg`

Kiến thức cần nắm:
- schema/table/index
- CRUD cơ bản
- kết nối bằng connection string
- kiểm tra dữ liệu bằng `psql`

---

## 6) Authentication core (Keycloak/OIDC)

Flow cơ bản:
1. User login ở IdP (Keycloak)
2. IdP cấp token (JWT)
3. API validate token để bảo vệ tài nguyên

Thành phần bắt buộc:
- Realm
- Client
- User
- Token endpoint

Mục tiêu học được:
- phân biệt authentication vs authorization
- hiểu token-based auth trong cloud-native

---

## 7) Object Storage core (MinIO/S3)

Khác file system truyền thống:
- lưu object theo bucket + key
- phù hợp ảnh, tài liệu, backup

Khái niệm cần biết:
- Bucket
- Object
- Access policy (public/private)
- Endpoint API/console

---

## 8) DNS nội bộ core

Bind9 cung cấp map tên ↔ IP nội bộ:
- ví dụ `web-frontend-server.cloud.local -> 10.10.10.10`

Lợi ích:
- service discovery
- dễ đổi IP mà không đổi code/config client

Những điểm cần chú ý:
- zone file đúng format
- named config load đúng zone
- DNS server phải lắng nghe đúng interface/port

---

## 9) Monitoring & Observability core

## 9.1 Prometheus
- Pull metrics theo `scrape_configs`
- kiểm tra target `UP`/`DOWN`

## 9.2 Node Exporter
- expose CPU/RAM/network metrics

## 9.3 Grafana
- datasource -> Prometheus
- dashboard panel dùng PromQL

3 metric gợi ý:
- `node_cpu_seconds_total`
- `node_memory_MemAvailable_bytes`
- `node_network_receive_bytes_total`

---

## 10) Quy trình vận hành chuẩn (Ops flow)

1. Build image
2. Up stack
3. Health-check từng layer (web/api/db/auth/...)
4. Chạy test endpoints
5. Theo dõi logs khi có lỗi
6. Fix config -> recreate service -> retest

Lệnh hay dùng:
- `docker compose ps`
- `docker compose logs -f <service>`
- `docker compose up -d --force-recreate <service>`
- `docker exec -it <container> sh`

---

## 11) Troubleshooting mindset (rất quan trọng)

Khi lỗi, debug theo thứ tự:

1. **Port conflict host**
- Ví dụ Apache local chiếm `8080` -> Docker web không hiển thị đúng

2. **Container up/down**
- `docker compose ps`

3. **Service nội bộ có reachable không**
- test từ trong network/container

4. **Config load đúng chưa**
- Nginx config, Bind zone, Prometheus yaml

5. **Logs nói gì**
- ưu tiên đọc logs trước khi sửa code

Nguyên tắc: **test nhỏ, xác nhận nhanh, sửa tối thiểu, retest ngay**.

---

## 12) Tiêu chí hoàn thành dạng project này

Bạn nên đạt được:
- chạy được full stack bằng 1 file compose
- mỗi service có minh chứng test
- có route qua gateway
- có monitor + dashboard
- có auth realm/client/user
- có data trong DB + object trong storage
- có docs rõ ràng để người khác chạy lại

Nếu làm được các phần trên, bạn đã nắm được nền tảng cực tốt cho hệ cloud-native thực tế.