# MyMiniCloud Runbook

## 1) Start all services

```powershell
Set-Location "D:\mini-cloud\mini-cloud\hotenSVminiclouddemo"
docker compose build --no-cache
docker compose up -d
docker compose ps
```

## 2) Quick command-based checks

```powershell
curl -I http://localhost:8080/
curl -I http://localhost:8080/blog
curl http://localhost:8085/hello
curl http://localhost/api/hello
curl http://localhost/student/
curl -I http://localhost/auth/
```

DNS check (from host with `dig` installed):

```powershell
dig @127.0.0.1 -p 1053 web-frontend-server.cloud.local +short
```

## 3) Manual UI checks (click-by-click)

### Keycloak (`authentication-identity-server`)

1. Open `http://localhost:8081`
2. Login with `admin / admin`
3. Confirm Admin Console dashboard appears
4. Create test user `sv01`

### MinIO (`object-storage-server`)

1. Open `http://localhost:9001`
2. Login with `minioadmin / minioadmin`
3. Create bucket `demo`
4. Upload one file (example: `index.html`)
5. Confirm file is listed in bucket

### Prometheus (`monitoring-prometheus-server`)

1. Open `http://localhost:9090`
2. Go to **Status → Targets**
3. Confirm `monitoring-node-exporter-server:9100` is `UP`
4. In Graph, run `node_cpu_seconds_total`

### Grafana (`monitoring-grafana-dashboard-server`)

1. Open `http://localhost:3000`
2. Login with `admin / admin` (change password if prompted)
3. Add datasource: **Prometheus**
4. URL: `http://monitoring-prometheus-server:9090`
5. Save & test datasource
6. Import dashboard: **Node Exporter Full**

## 4) Database checks

```powershell
docker exec -it relational-database-server psql -U postgres -d minicloud -c "SELECT * FROM notes;"
```

## 5) Reverse proxy checks

```powershell
curl -I http://localhost/
curl -s http://localhost/api/hello
curl -I http://localhost/auth/
curl -s http://localhost/student/
```
