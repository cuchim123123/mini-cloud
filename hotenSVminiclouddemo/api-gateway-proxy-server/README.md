# API Gateway Proxy Server

Nginx reverse proxy entrypoint.

## Routes

- `/` → `web-frontend-server:80`
- `/api/` → `application-backend-server:8081/`
- `/auth/` → `authentication-identity-server:8080/`
- `/student/` → `application-backend-server:8081/student`
