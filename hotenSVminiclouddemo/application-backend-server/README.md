# Application Backend Server

NestJS backend for MyMiniCloud.

## Endpoints

- `GET /hello` → health-style hello JSON
- `GET /student` → returns student list from `students.json`
- `GET /students-db` → returns seeded data from PostgreSQL via Prisma

## Local Run

```bash
npm install
npm run prisma:generate
npm run dev
```

Default port: `8081`
