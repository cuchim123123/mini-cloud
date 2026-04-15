# Application Backend Server

NestJS backend for MyMiniCloud.

## Endpoints

- `GET /hello` → health-style hello JSON
- `GET /student` → returns student list from `students.json`
- `GET /students-db` → returns seeded data from PostgreSQL via `pg`

## Local Run

```bash
npm install
npm run dev
```

Default port: `8081`
