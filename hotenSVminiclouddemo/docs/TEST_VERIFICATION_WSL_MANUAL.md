# MyMiniCloud - Test & Verification Guide (Ubuntu via WSL + Manual)

This guide verifies **each required service** using:
- **Command-based checks** from **Ubuntu (WSL)**
- **Manual checks** where UI interaction is required

Applies to project folder:
- `d:/mini-cloud/mini-cloud/hotenSVminiclouddemo`

---

## 0) Prerequisites

Run in **Ubuntu (WSL)** terminal:

```bash
cd /mnt/d/mini-cloud/mini-cloud/hotenSVminiclouddemo
docker compose up -d --build
docker compose ps
```

Expected:
- All core containers are `Up`.
- Network `cloud-net` exists.

---

## 1) Web Frontend Server (`web-frontend-server`)

### Command checks (WSL)

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/blog/
```

Expected:
- HTTP `200`
- Home page and blog page render successfully.

### Manual check
- Open `http://localhost:8080`
- Confirm homepage loads.
- Open `http://localhost:8080/blog/`
- Confirm blog page loads.

---

## 2) Application Backend Server (`application-backend-server`)

### Command checks (WSL)

```bash
curl -i http://localhost:8085/hello
curl -i http://localhost/api/hello
curl -i http://localhost/api/student
curl -i http://localhost/api/students-db
```

Expected:
- `200` for all endpoints.
- `/hello` returns JSON message.
- `/student` returns student list.
- `/students-db` returns DB-backed data.

---

## 3) Relational Database Server (`relational-database-server`)

### Command checks (WSL)

```bash
docker exec -it relational-database-server psql -U postgres -d minicloud -c "SELECT COUNT(*) FROM notes;"
docker exec -it relational-database-server psql -U postgres -d studentdb -c "SELECT COUNT(*) FROM students;"
```

Expected:
- `notes` table exists with at least 1 row.
- `students` table exists with at least 3 rows.

---

## 4) Authentication Server (`authentication-identity-server`, Keycloak)

### Command checks (WSL)

```bash
curl -i http://localhost:8081/
curl -i http://localhost:8081/realms/sv001-realm/.well-known/openid-configuration
curl -i http://localhost/auth/
```

Expected:
- Keycloak root reachable (`200` or redirect chain to login).
- Well-known endpoint returns `200` JSON.
- Proxy auth path works (`302`/`200` depending on redirect handling).

### Manual check
- Open `http://localhost:8081`
- Login with admin credentials.
- Confirm realm `sv001-realm` exists.
- Confirm users/clients are visible and manageable.

---

## 5) Object Storage Server (`object-storage-server`, MinIO)

### Command checks (WSL)

```bash
curl -i http://localhost:9000/minio/health/live
curl -i http://localhost:9001/
```

Expected:
- Health endpoint returns `200`.
- Console reachable.

### Manual check
- Open `http://localhost:9001`
- Login with configured credentials.
- Confirm buckets exist (`demo`, `profile-pics`, `documents`) or create them.
- Upload a sample file and verify it appears.

---

## 6) Internal DNS Server (`internal-dns-server`)

### Command checks (WSL)

```bash
docker run --rm --network cloud-net alpine:3.20 sh -lc 'apk add --no-cache bind-tools >/dev/null 2>&1; dig +short @internal-dns-server -p 53 web-frontend-server.cloud.local; dig +short @internal-dns-server -p 53 app-backend.cloud.local; dig +short @internal-dns-server -p 53 minio.cloud.local; dig +short @internal-dns-server -p 53 keycloak.cloud.local'
```

Expected:
- DNS answers are returned for all records.
- IPs match your `db.cloud.local` zone file.

---

## 7) Monitoring Server (`monitoring-prometheus-server` + node exporter)

### Command checks (WSL)

```bash
curl -i http://localhost:9090/-/healthy
curl -s http://localhost:9090/api/v1/targets | jq '.status, .data.activeTargets[]?.labels.job, .data.activeTargets[]?.health'
```

Expected:
- Prometheus health endpoint returns `200`.
- `node` target is present and `up`.
- `web` target (if configured) is present and `up`.

### Manual check
- Open `http://localhost:9090`
- Go to **Status -> Targets**
- Confirm required targets are **UP**.

---

## 8) Visualization/Logging Server (`monitoring-grafana-dashboard-server`)

### Command checks (WSL)

```bash
curl -i http://localhost:3000/api/health
```

Expected:
- Grafana health endpoint returns `200`.

### Manual check
- Open `http://localhost:3000`
- Login with admin account.
- Confirm Prometheus datasource is configured and healthy.
- Confirm dashboard (e.g., `System Health`) loads and shows data.

---

## 9) Reverse Proxy / API Gateway (`api-gateway-proxy-server`)

### Command checks (WSL)

```bash
curl -i http://localhost/
curl -i http://localhost/api/hello
curl -i http://localhost/student/
curl -i http://localhost/auth/
```

Expected:
- `/` -> `200` (frontend)
- `/api/hello` -> `200` JSON from backend
- `/student/` -> `200` JSON student list
- `/auth/` -> Keycloak route (`302`/`200` based on redirect flow)

---

## 10) Internal network connectivity check (cloud-net)

### Command checks (WSL)

```bash
docker run --rm --network cloud-net alpine:3.20 sh -lc 'apk add --no-cache iputils >/dev/null 2>&1; for h in web app-server db keycloak minio prometheus grafana dns-server; do ping -c 1 -W 1 $h >/dev/null 2>&1 && echo "$h:ok" || echo "$h:fail"; done'
```

Expected:
- All hosts return `ok`.

---

## Optional: one-shot quick verification

```bash
curl -s -o /dev/null -w "web=%{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "app=%{http_code}\n" http://localhost:8085/hello
curl -s -o /dev/null -w "proxy_api=%{http_code}\n" http://localhost/api/hello
curl -s -o /dev/null -w "auth=%{http_code}\n" http://localhost/auth/
curl -s -o /dev/null -w "minio=%{http_code}\n" http://localhost:9000/minio/health/live
curl -s -o /dev/null -w "prom=%{http_code}\n" http://localhost:9090/-/healthy
curl -s -o /dev/null -w "grafana=%{http_code}\n" http://localhost:3000/api/health
```

Expected:
- `web=200`, `app=200`, `proxy_api=200`, `auth=302/200`, `minio=200`, `prom=200`, `grafana=200`.

---

## Evidence checklist for report/demo

Capture screenshots/logs for:
- `docker compose ps`
- Web home + blog
- Backend API responses (`/hello`, `/student`, `/students-db`)
- DB SQL query outputs
- Keycloak admin UI
- MinIO bucket + uploaded object
- DNS `dig` outputs
- Prometheus Targets page
- Grafana dashboard page
- Proxy routes via `localhost`
- Ping matrix results
