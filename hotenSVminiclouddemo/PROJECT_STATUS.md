# MyMiniCloud Project Status

## ✅ Basic Demo Requirements (5 points) - COMPLETED

All 9 required servers are running and verified:

### 1️⃣ Web Frontend Server (Nginx + React)
- **Status**: ✅ Running on port 8080
- **Test**: `http://localhost:8080/`
- **Features**: React + Vite + Nginx serving static SPA
- **Result**: Returns HTML with React app

### 2️⃣ Application Backend Server (NestJS)
- **Status**: ✅ Running on port 8085 (8081 internal)
- **Endpoints**:
  - `GET /hello` → `{"message":"Hello from App Server!"}`
  - `GET /student` → Returns 5 students from students.json
  - `GET /students-db` → Returns data from PostgreSQL
- **Test**: 
  ```powershell
  Invoke-WebRequest -Uri http://localhost/api/hello -UseBasicParsing
  Invoke-WebRequest -Uri http://localhost/api/student -UseBasicParsing
  Invoke-WebRequest -Uri http://localhost/api/students-db -UseBasicParsing
  ```

### 3️⃣ Relational Database Server (PostgreSQL)
- **Status**: ✅ Running on port 5432
- **Databases Created**:
  - `minicloud` - Contains `notes` table with sample data
  - `studentdb` - Contains `students` table with 3 records (expandable)
- **Connection**: `postgresql://postgres:postgres@localhost:5432`

### 4️⃣ Authentication Identity Server (Keycloak)
- **Status**: ✅ Running on port 8081
- **Access**: `http://localhost:8081`
- **Default Credentials**: admin / admin

### 5️⃣ Object Storage Server (MinIO)
- **Status**: ✅ Running on ports 9000-9001
- **Console**: `http://localhost:9001`
- **Credentials**: minioadmin / minioadmin

### 6️⃣ Internal DNS Server (Bind9)
- **Status**: ✅ Running on port 1053/UDP
- **Zone**: cloud.local
- **Records**:
  - ns.cloud.local (127.0.0.1)
  - web-frontend-server.cloud.local (10.10.10.10)
  - application-backend.cloud.local (10.10.10.20)
  - object-storage.cloud.local (10.10.10.30)
  - authentication-identity.cloud.local (10.10.10.40)

### 7️⃣ Monitoring Node Exporter
- **Status**: ✅ Running on port 9100
- **Purpose**: Collects system metrics

### 8️⃣ Monitoring Prometheus
- **Status**: ✅ Running on port 9090
- **Access**: `http://localhost:9090`
- **Targets**: 
  - node (monitoring-node-exporter-server:9100) ✅ UP
  - web (web-frontend-server:80) ✅ Configured

### 9️⃣ Grafana Dashboard
- **Status**: ✅ Running on port 3000
- **Access**: `http://localhost:3000`
- **Default Credentials**: admin / admin
- **Features**: Visualize Prometheus metrics

### 🔟 API Gateway / Reverse Proxy
- **Status**: ✅ Running on port 80
- **Routes**:
  - `/` → web-frontend-server (80)
  - `/api/*` → application-backend-server (8081)
  - `/auth/*` → authentication-identity-server (8080)
  - `/student/*` → application-backend-server (8081/student)

---

## ✅ Extension Requirements (5 points) - IN PROGRESS

### 2️⃣ Web Frontend - Blog (0.5 points) ✅ COMPLETED
- **Status**: 3 blog posts added with rich content
- **Posts**:
  1. "Getting Started with Docker & Containers" - `/blog/docker-basics`
  2. "Microservices Architecture Patterns" - `/blog/microservices`
  3. "Cloud Infrastructure & DevOps Best Practices" - `/blog/cloud-devops`
- **Features**:
  - React Router for navigation
  - Responsive card layout
  - Styled links and buttons
  - Each post has detailed content with examples
- **Test**: Navigate to `http://localhost/blog` or `http://localhost:8080/blog`

### 3️⃣ Backend API - /student endpoint (0.5 points) ✅ COMPLETED
- **Status**: Fully implemented
- **Endpoint**: `GET /api/student` or `http://localhost:8085/student`
- **Data Source**: students.json with 5 records
- **Response**:
  ```json
  [
    {"id":"SV001","name":"Nguyen Van A","major":"Computer Science","gpa":3.5},
    {"id":"SV002","name":"Tran Thi B","major":"Software Engineering","gpa":3.6},
    ...
  ]
  ```

### 4️⃣ Database - Create studentdb (0.5 points) ✅ COMPLETED
- **Status**: Database and table created
- **Database**: `studentdb`
- **Table**: `students`
- **Schema**:
  ```sql
  CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) UNIQUE NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    dob DATE,
    major VARCHAR(50)
  );
  ```
- **Sample Data**: 3 records inserted
  - SV001: Nguyen Van A, DOB: 2002-03-15, Major: Computer Science
  - SV002: Tran Thi B, DOB: 2002-06-20, Major: Software Engineering
  - SV003: Le Van C, DOB: 2002-09-10, Major: Information Systems
- **Access**: `postgresql://postgres:postgres@relational-database-server:5432/studentdb`

### 5️⃣ Keycloak - Realm & Client (0.5 points) ⏳ TODO
- **Status**: Keycloak running, needs manual configuration
- **Steps to Complete**:
  1. Access http://localhost:8081
  2. Login with admin / admin
  3. Create new Realm: `realm_sv001`
  4. Create 2 Users: `sv01`, `sv02`
  5. Create Client: `flask-app` (Access Type: public)
  6. Get token endpoint URL
  7. Test `/secure` endpoint in backend

### 6️⃣ MinIO - Upload files (0.5 points) ⏳ TODO
- **Status**: MinIO running, needs file uploads
- **Steps to Complete**:
  1. Access http://localhost:9001 (minioadmin / minioadmin)
  2. Create bucket: `profile-pics`
  3. Upload avatar image
  4. Create bucket: `documents`
  5. Upload PDF file
  6. Verify public URLs accessible

### 7️⃣ DNS - Add zone records (0.5 points) ✅ COMPLETED
- **Status**: Records already configured in db.cloud.local
- **Records Present**:
  - web-frontend-server.cloud.local → 10.10.10.10
  - application-backend.cloud.local → 10.10.10.20
  - object-storage.cloud.local → 10.10.10.30
  - authentication-identity.cloud.local → 10.10.10.40

### 8️⃣ Prometheus - Add web target (0.5 points) ✅ COMPLETED
- **Status**: web-frontend-server target added to prometheus.yml
- **Configuration**:
  ```yaml
  - job_name: 'web'
    static_configs:
      - targets: ['web-frontend-server:80']
  ```
- **Verification**: Visit http://localhost:9090/targets to see both targets UP

### 9️⃣ Grafana - Custom Dashboard (0.5 points) ⏳ TODO
- **Status**: Grafana running, needs manual dashboard creation
- **Steps to Complete**:
  1. Access http://localhost:3000 (admin / admin)
  2. Create New Dashboard named "System Health of SV_ID"
  3. Add Panels:
     - CPU Usage: `rate(node_cpu_seconds_total[5m])`
     - Memory Usage: `node_memory_MemAvailable_bytes`
     - Network Traffic: `rate(node_network_receive_bytes_total[5m])`
  4. Set datasource to Prometheus
  5. Save and screenshot

### 🔟 API Gateway - /student/ route (0.5 points) ✅ COMPLETED
- **Status**: Route configured in nginx.conf
- **Configuration**:
  ```nginx
  location /student/ {
    proxy_pass http://application-backend-server:8081/student;
  }
  ```
- **Test**: `Invoke-WebRequest -Uri http://localhost/student/ -UseBasicParsing`
- **Result**: Returns student list from backend

### ⓫ Load Balancing - Round Robin (0.5 points) ⏳ TODO
- **Status**: Not yet implemented
- **Steps to Complete**:
  1. Create second web-frontend-server service (web-frontend-server2)
  2. Update nginx.conf with upstream block:
     ```nginx
     upstream web_backend {
       server web-frontend-server:80;
       server web-frontend-server2:80;
     }
     ```
  3. Update proxy_pass to use upstream
  4. Verify round-robin load distribution
  5. Screenshot results showing alternating access

---

## 🔗 Quick Access Links

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:8080 | - |
| Frontend Blog | http://localhost/blog | - |
| API (direct) | http://localhost:8085 | - |
| API (via proxy) | http://localhost/api | - |
| Keycloak | http://localhost:8081 | admin/admin |
| MinIO Console | http://localhost:9001 | minioadmin/minioadmin |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin/admin |
| DNS Test | dig @127.0.0.1 -p 1053 web-frontend-server.cloud.local | - |

---

## 📊 Test Commands (PowerShell)

```powershell
# Test all endpoints
$endpoints = @(
    'http://localhost/api/hello',
    'http://localhost/api/student',
    'http://localhost/api/students-db',
    'http://localhost/student/'
)

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $endpoint"
    Invoke-WebRequest -Uri $endpoint -UseBasicParsing | Select-Object -ExpandProperty Content
    Write-Host ""
}

# Test web frontend
Invoke-WebRequest -Uri http://localhost:8080 -UseBasicParsing | Select-Object -ExpandProperty StatusCode

# Test blog pages
Invoke-WebRequest -Uri http://localhost/blog -UseBasicParsing | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -Uri http://localhost/blog/docker-basics -UseBasicParsing | Select-Object -ExpandProperty StatusCode
```

---

## 📝 Git Commits

Recent commits for extension requirements:
- `dd9bcf4` - feat: add blog posts, studentdb, prometheus targets, and api gateway routes
- `3e5fed6` - refactor(app): replace prisma with pg client

---

## 🚀 What's Next

**Immediate (Recommended)**:
1. ✅ Complete blog implementation
2. ✅ Database studentdb setup
3. ✅ API Gateway routing
4. ✅ Prometheus web target
5. ⏳ Keycloak realm creation (manual UI)
6. ⏳ MinIO file uploads (manual UI)
7. ⏳ Grafana dashboard creation (manual UI)
8. ⏳ Load balancing with second web server

**Future Enhancements**:
- Add more API endpoints (CRUD operations)
- Implement API authentication with Keycloak
- Add database migration scripts
- Create custom metrics
- Deploy to AWS EC2
- Push images to Docker Hub

