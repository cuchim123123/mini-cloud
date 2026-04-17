# MiniCloud Configuration Guide

## Overview

MiniCloud uses environment variables for all configuration. This allows the same codebase to run in development, staging, and production with different settings.

## Configuration Files

1. **`.env`** (Git-ignored) - Local development configuration
   - Copy from `.env.example`
   - Contains secrets and local settings
   - Never commit to version control

2. **`.env.example`** - Template for team use
   - Shows all required variables
   - Uses safe default examples

3. **`.env.production`** - Complete production checklist
   - Comprehensive documentation
   - Security best practices
   - Production deployment checklist

## Core Configuration Categories

### 1. Database (PostgreSQL)

```env
DB_USER=postgres                    # PostgreSQL user
DB_PASSWORD=<strong-password>       # PostgreSQL password
DB_HOST=relational-database-server  # Database hostname/IP
DB_PORT=5432                        # PostgreSQL port
DB_NAME=postgres                    # Default database name
```

**Deployment Notes:**
- Always change `DB_PASSWORD` from default in all environments
- For production, use a dedicated read-only user for backups
- Enable SSL connections in production: `?sslmode=require`
- Consider using managed database services (AWS RDS, Azure Database)

### 2. Keycloak Authentication

```env
KEYCLOAK_ADMIN=admin                         # Admin console username
KEYCLOAK_ADMIN_PASSWORD=<strong-password>   # Admin console password
KEYCLOAK_ISSUER_URL=http://...             # Token issuer (validated by backend)
SMOKE_CLIENT_SECRET=<strong-secret>         # Service account secret for tests
OIDC_AUDIENCE=myapp                         # Audience claim in tokens
KEYCLOAK_ADMIN_ROLE=admin                   # Admin role name
KEYCLOAK_REQUEST_TIMEOUT_MS=2500            # Request timeout
KC_HOSTNAME=localhost                       # Public hostname
KC_HOSTNAME_STRICT=false                    # Enforce hostname (true in prod)
KC_HTTP_ENABLED=true                        # Allow HTTP (false in prod - use HTTPS)
```

**Deployment Notes:**
- Change admin password immediately
- Set `KC_HOSTNAME_STRICT=true` in production
- Use HTTPS reverse proxy (set `KC_HTTP_ENABLED=false`)
- Configure `KEYCLOAK_ISSUER_URL` to match your production domain
- Generate strong `SMOKE_CLIENT_SECRET` using: `openssl rand -base64 32`

### 3. MinIO Object Storage

```env
MINIO_ROOT_USER=minioadmin              # Root admin user
MINIO_ROOT_PASSWORD=<strong-password>   # Root admin password
MINIO_ACCESS_KEY=minioadmin             # API access key
MINIO_SECRET_KEY=<strong-password>      # API secret key
MINIO_BUCKET_NAME=documents             # S3 bucket name
MINIO_OBJECT_PREFIX=blog                # Object key prefix
MINIO_REGION=us-east-1                  # AWS region
MINIO_PUBLIC_BASE_URL=http://...       # Public access URL
MINIO_ENDPOINT=object-storage-server:9000
```

**Deployment Notes:**
- Always change default credentials (`minioadmin/minioadmin`)
- Generate separate access keys for different applications
- Use `MINIO_PUBLIC_BASE_URL` that clients can reach (e.g., `https://storage.example.com`)
- Consider AWS S3, Azure Blob Storage, or managed MinIO services

### 4. Grafana Monitoring

```env
GRAFANA_ADMIN_USER=admin                    # Dashboard username
GRAFANA_ADMIN_PASSWORD=<strong-password>   # Dashboard password
```

**Deployment Notes:**
- Change password before production deployment
- Consider using SAML/OAuth for team access
- Configure data retention policies

### 5. Application URLs

```env
FRONTEND_URL=http://localhost          # Frontend base URL (for CORS, redirects)
API_BASE_URL=http://localhost/api      # Backend API base URL
KEYCLOAK_ISSUER_URL=http://...         # Keycloak token issuer
MINIO_PUBLIC_BASE_URL=http://...       # Public S3 access URL
```

**Deployment Notes:**
- Update all URLs to your production domain
- Use HTTPS for production
- Ensure CORS headers are configured correctly
- Test cross-origin requests thoroughly

## Environment Setup

### 1. Local Development

```bash
# Copy template
cp .env.example .env

# Edit for local settings
nano .env

# Example content:
DB_PASSWORD=dev-password
KEYCLOAK_ADMIN_PASSWORD=dev-password
SMOKE_CLIENT_SECRET=dev-secret
MINIO_ROOT_PASSWORD=dev-password
```

### 2. Docker Compose with .env

```bash
# Automatically loaded by docker-compose
docker compose up -d

# Or explicitly specify .env file
docker compose --env-file .env.production up -d
```

### 3. Production Deployment (AWS/Azure)

Use container service's secrets management:

**AWS ECS:**
```bash
aws ecs register-task-definition \
  --family minicloud \
  --container-definitions '[
    {
      "environment": [
        {"name": "DB_PASSWORD", "value": "secret-from-secrets-manager"},
        ...
      ]
    }
  ]'
```

**Azure Container Instances:**
```bash
az container create \
  --resource-group mygroup \
  --registry-login-server myregistry.azurecr.io \
  --environment-variables \
    DB_PASSWORD=$(az keyvault secret show --vault-name mykeyvault --name db-password --query value -o tsv) \
```

**Kubernetes:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: minicloud-secrets
type: Opaque
stringData:
  DB_PASSWORD: $(aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text)
  KEYCLOAK_ADMIN_PASSWORD: $(aws secretsmanager get-secret-value --secret-id keycloak-password --query SecretString --output text)
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
    - secretRef:
        name: minicloud-secrets
```

## Security Best Practices

### 1. Secret Management

- ❌ Don't: Store secrets in .env or hardcoded in code
- ✅ Do: Use secret managers (AWS Secrets Manager, Azure KeyVault, HashiCorp Vault)
- ✅ Do: Rotate secrets every 90 days
- ✅ Do: Use separate credentials for each environment

### 2. Database Security

- ✅ Use strong passwords (min 20 characters, mixed case, numbers, symbols)
- ✅ Enable database encryption at rest
- ✅ Enable SSL/TLS for database connections
- ✅ Use read-only replicas for backups
- ✅ Implement connection pooling for performance

### 3. API Security

- ✅ Use HTTPS for all communications
- ✅ Implement rate limiting
- ✅ Use API keys or OAuth for service-to-service auth
- ✅ Validate all inputs
- ✅ Implement CORS properly

### 4. Monitoring & Alerting

- ✅ Monitor failed login attempts
- ✅ Alert on database connection errors
- ✅ Track storage usage
- ✅ Monitor API response times
- ✅ Set up log aggregation (ELK, DataDog, etc.)

## Troubleshooting

### Services Won't Start

**Problem:** Database connection error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Check `DB_HOST` is correct (use `localhost` for dev, service name for Docker)
- Verify database is running: `docker-compose ps`
- Check `DB_PASSWORD` matches

### Authentication Failures

**Problem:** 401 Unauthorized errors
```
Error: Invalid token or expired
```

**Solution:**
- Verify `KEYCLOAK_ISSUER_URL` is accessible from backend
- Check `KEYCLOAK_ADMIN_PASSWORD` is correct
- Verify token hasn't expired (60min default)
- Check `OIDC_AUDIENCE` claim in token matches `myapp`

### Storage Issues

**Problem:** Upload fails or objects not accessible
```
Error: NoSuchBucket: The specified bucket does not exist
```

**Solution:**
- Verify `MINIO_PUBLIC_BASE_URL` is accessible
- Check bucket exists: `docker-compose exec object-storage-server mc ls local/documents`
- Verify `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` are correct

## Environment Variables Reference

| Variable | Default | Required | Notes |
|----------|---------|----------|-------|
| DB_USER | postgres | No | Database user |
| DB_PASSWORD | postgres | ⚠️ Change | Database password |
| DB_HOST | relational-database-server | No | Database hostname |
| DB_PORT | 5432 | No | Database port |
| KEYCLOAK_ADMIN | admin | No | Keycloak admin user |
| KEYCLOAK_ADMIN_PASSWORD | admin | ⚠️ Change | Keycloak admin password |
| SMOKE_CLIENT_SECRET | (none) | Yes | Service account secret |
| MINIO_ROOT_USER | minioadmin | No | MinIO root user |
| MINIO_ROOT_PASSWORD | minioadmin | ⚠️ Change | MinIO root password |
| MINIO_ACCESS_KEY | minioadmin | ⚠️ Change | MinIO API key |
| MINIO_SECRET_KEY | minioadmin | ⚠️ Change | MinIO API secret |
| GRAFANA_ADMIN_USER | admin | No | Grafana admin user |
| GRAFANA_ADMIN_PASSWORD | admin | ⚠️ Change | Grafana admin password |

## See Also

- `.env.example` - Quick configuration template
- `.env.production` - Complete production checklist
- `RUNBOOK.md` - Deployment and operation guide
- `SERVICE_ARCHITECTURE_AND_FLOW.md` - Service architecture
