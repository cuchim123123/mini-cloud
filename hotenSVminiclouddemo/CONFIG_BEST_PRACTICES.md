# Configuration Best Practices

This document outlines how MiniCloud manages configuration and explains why certain patterns were chosen.

## Philosophy: 12-Factor App Configuration

MiniCloud follows the [12-Factor App](https://12factor.net/) methodology, specifically:

> Store config in environment variables

This means:
- ✅ Configuration comes from environment variables
- ✅ All secrets are externalized (not in code or .env files in repo)
- ✅ Same Docker image runs in dev, staging, and production
- ✅ No rebuilding Docker images for different environments

## Configuration Hierarchy

```
Code
  ↓
Environment Variables (highest priority)
  ↓
.env file in project root (development only)
  ↓
Docker-compose defaults (lowest priority)
```

### How It Works

**In code (app.module.ts):**
```typescript
// Required variables throw error if missing
const dbUrl = process.env.DATABASE_URL || (() => {
  throw new Error('DATABASE_URL is required');
})();

// Optional variables use safe defaults
const timeout = Number(process.env.TIMEOUT_MS ?? 2500);
```

**In docker-compose.yml:**
```yaml
environment:
  DATABASE_URL: ${DATABASE_URL:-postgresql://...}  # Use env, fallback to default
  TIMEOUT_MS: ${TIMEOUT_MS:-2500}                   # Optional with safe default
```

## The `.env` Files

### `.env.example` - For Team/Developers
```
# What to use: Check into Git ✅
# Purpose: Quick template for local development
# Contains: Non-sensitive defaults and placeholder values
```

### `.env` - Local Development (Git-ignored ✅)
```
# What to use: Never check into Git ❌
# Purpose: Local overrides for your machine
# Contains: Your actual local secrets and custom settings
# Usage: Copy from .env.example and customize
```

### `.env.production` - Complete Reference (Check into Git ✅)
```
# What to use: Check into Git ✅
# Purpose: Documentation and production checklist
# Contains: All possible configuration options with explanations
# Security: No actual secrets, just placeholders
```

## Why This Approach?

### ✅ Security Benefits
- Secrets never in code or git history
- Different credentials per environment
- Easy credential rotation without redeploying code
- Works with enterprise secret managers

### ✅ Deployment Benefits
- Same Docker image for dev/staging/prod
- No environment-specific builds
- Easy CI/CD integration
- Supports Kubernetes, Lambda, Docker Swarm, etc.

### ✅ Developer Experience
- `.env.example` shows what's available
- `.env.production` documents everything
- Clear error messages when required vars missing
- Can develop without Docker (set env vars manually)

## Usage Patterns

### Local Development
```bash
# 1. Copy template
cp .env.example .env

# 2. Edit for your machine
nano .env
# Set DB_PASSWORD, KEYCLOAK_ADMIN_PASSWORD, etc.

# 3. Docker Compose loads automatically
docker compose up -d

# 4. Backend reads env vars
# process.env.DATABASE_URL = "postgresql://..."
```

### Docker Compose (Production-like)
```bash
# Load specific config
docker compose --env-file .env.production up -d

# Or set variables before running
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id db-password)
docker compose up -d
```

### Kubernetes
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: minicloud-config
data:
  OIDC_AUDIENCE: myapp
  MINIO_BUCKET_NAME: documents
---
apiVersion: v1
kind: Secret
metadata:
  name: minicloud-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:pass@postgres:5432/minicloud
  KEYCLOAK_ADMIN_PASSWORD: <strong-password>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minicloud-backend
spec:
  containers:
  - name: app
    image: myregistry.azurecr.io/minicloud/app:latest
    envFrom:
    - configMapRef:
        name: minicloud-config
    - secretRef:
        name: minicloud-secrets
```

### AWS ECS / Lambda
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name minicloud/prod/database-url \
  --secret-string "postgresql://..."

# ECS task reads from Secrets Manager
aws ecs register-task-definition \
  --family minicloud \
  --container-definitions '[{
    "environment": [
      {"name": "ENVIRONMENT", "value": "production"}
    ],
    "secrets": [
      {
        "name": "DATABASE_URL",
        "valueFrom": "arn:aws:secretsmanager:region:account:secret:minicloud/prod/database-url"
      }
    ]
  }]'
```

### Azure Container Instances
```bash
# Store in Azure Key Vault
az keyvault secret set \
  --vault-name minicloud-kv \
  --name database-password \
  --value <strong-password>

# Reference in deployment
az container create \
  --resource-group mygroup \
  --environment-variables \
    ENVIRONMENT=production \
    DATABASE_USER=postgres \
  --secrets \
    DATABASE_PASSWORD=$(az keyvault secret show --vault-name minicloud-kv --name database-password)
```

## Configuration Categories Explained

### 1. Database Configuration
**Why externalized:**
- Different databases per environment (SQLite dev → PostgreSQL prod)
- Different credentials for security
- Easy failover/migration to different host

**Variables:**
- `DB_USER`, `DB_PASSWORD` - Credentials (change immediately!)
- `DB_HOST` - Can be localhost, hostname, or DNS
- `DB_PORT` - Allows proxy/tunnel setups

### 2. Keycloak Authentication
**Why externalized:**
- Different realms per environment
- Admin credentials change per deployment
- Different token issuers (dev vs prod)

**Variables:**
- `KEYCLOAK_ADMIN_PASSWORD` - Change from default
- `KC_HOSTNAME` - Public hostname for external access
- `SMOKE_CLIENT_SECRET` - Service account secret for automation

### 3. MinIO Storage
**Why externalized:**
- Different buckets per environment
- Different access keys for audit trail
- Public URL differs from internal endpoint

**Variables:**
- `MINIO_ROOT_PASSWORD` - Root credentials (change!)
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` - API credentials
- `MINIO_PUBLIC_BASE_URL` - URL visible to clients (use your domain in prod)

### 4. Monitoring (Grafana)
**Why externalized:**
- Different admin passwords per environment
- Different datasources per deployment
- Team access control

## Migration from Hardcoded Values

### Before (Anti-pattern ❌)
```typescript
// Hardcoded in code
const DB_PASSWORD = "postgres";
const KEYCLOAK_URL = "http://localhost:8080";
const MINIO_SECRET = "minioadmin";
```

### After (Best practice ✅)
```typescript
// Externalized, with fallback for development
const dbPassword = process.env.DB_PASSWORD ?? (() => {
  throw new Error('DB_PASSWORD is required');
})();

// Optional with safe default
const keycloakUrl = process.env.KEYCLOAK_ISSUER_URL ?? 'http://localhost:8080/realms/...';
```

## Security Checklist

### During Development ✅
- [ ] Copy .env.example to .env
- [ ] Verify .env is in .gitignore
- [ ] Update passwords from defaults if working in team
- [ ] Never commit .env file

### Before Staging ✅
- [ ] Generate strong passwords (20+ chars, mixed case/symbols)
- [ ] Use separate credentials (not the same as local)
- [ ] Test with actual environment variables (not .env file)
- [ ] Verify no secrets in logs

### Before Production ✅
- [ ] All passwords changed from defaults
- [ ] Enable KC_HOSTNAME_STRICT=true
- [ ] Use HTTPS (KC_HTTP_ENABLED=false with reverse proxy)
- [ ] Implement secret rotation (90 day policy)
- [ ] Set up monitoring and alerts
- [ ] Test disaster recovery
- [ ] Use managed secret service (AWS/Azure/Vault)
- [ ] Enable audit logging
- [ ] Review all access controls

## Troubleshooting

### Variable not being picked up
```bash
# Check if variable is set
echo $DATABASE_URL

# Docker-compose shows the value it's using
docker compose config | grep DATABASE_URL

# Check if it made it to the container
docker exec application-backend-server env | grep DATABASE_URL
```

### Required variable missing error
```
Error: DATABASE_URL is required

# Solution: Set the variable
export DATABASE_URL="postgresql://..."
docker compose up
```

### Port already in use
```bash
# Customize port via env var or docker-compose override
docker compose -f docker-compose.yml \
  -f docker-compose.override.yml \
  up -d

# In docker-compose.override.yml:
# services:
#   application-backend-server:
#     ports:
#       - "8086:8081"  # Use different port
```

## Further Reading

- [12 Factor App - Config](https://12factor.net/config)
- [Environment Variables Best Practices](https://www.freecodecamp.org/news/env-variables-explained/)
- [Docker Environment Variables](https://docs.docker.com/engine/reference/commandline/run/#env)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault](https://www.vaultproject.io/)

## See Also

- `CONFIG.md` - Complete configuration reference
- `.env.example` - Quick template
- `.env.production` - Production checklist
- `docker-compose.yml` - Service definitions
