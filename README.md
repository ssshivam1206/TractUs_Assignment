# TractUs Contract Operations Console

Full-stack engineering assignment for a multi-tenant Contract Operations Console. The app lets reviewers select an organisation, create contracts from structured JSON, manage contract lifecycle state, inspect audit history, receive realtime status updates, and upload PDF attachments.

## Deployed URLs

```text
Frontend: http://136.114.175.127:3000
Backend API: http://136.114.175.127:8001
API docs: http://136.114.175.127:8001/docs
Health check: http://136.114.175.127:8001/health
```

## Evaluation Access

No login is required for this assignment build.

1. Open the frontend URL.
2. Select `Demo Org A` or `Demo Org B` from the organisation selector.
3. Use the seeded contracts to test list, search, filter, pagination, detail view, audit trail, and workflow actions.
4. Create a new contract from the JSON create screen if you want to test validation and creation.
5. Open the same contract in two browser tabs, then finalize or archive it in one tab to verify realtime updates in the other.
6. Open a contract detail page to upload and list PDF attachments.

## Features

- Organisation-scoped contract CRUD
- Required JSON validation for contract payloads
- Draft-only update and delete rules
- `DRAFT -> FINALIZED -> ARCHIVED` workflow with invalid transitions rejected as `409 Conflict`
- Backend search by status, client name, and contract id
- Backend pagination
- Contract audit trail for create, update, finalize, archive, and delete
- SSE realtime contract updates across browser tabs
- PostgreSQL storage with `field_data` stored as JSON
- Seed data with 2 organisations and 10 contracts across multiple statuses
- OpenAPI JSON and Swagger UI docs
- PDF attachment upload with local disk storage and database metadata
- Docker Compose setup for PostgreSQL, backend, and frontend

## Tech Stack

```text
Frontend: Next.js, React, TypeScript, Tailwind CSS
Backend: Node.js, Express, TypeScript, Prisma, Zod, Multer
Database: PostgreSQL
Realtime: Server-Sent Events
Tests: Vitest
Deployment target: Google Cloud Compute Engine VM
```

## Environment Variables

Backend variables:

```env
PORT=8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5438/tractus_backend
UPLOADS_DIR=uploads
```

Frontend variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

For the deployed GCP VM, build the frontend with:

```env
NEXT_PUBLIC_API_BASE_URL=http://136.114.175.127:8001
```

## Local Development

### Option 1: Docker Compose

From the repo root:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 docker-compose up --build -d
```

If you use Docker Compose v2, this also works:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 docker compose up --build -d
```

Run migrations:

```bash
docker-compose run --rm backend npx prisma migrate deploy
```

Seed demo data:

```bash
docker-compose run --rm backend npm run db:seed
```

URLs:

```text
Frontend: http://localhost:3000
API: http://localhost:8001
Docs: http://localhost:8001/docs
Health: http://localhost:8001/health
```

### Option 2: Run Both Apps Manually

Backend:

```bash
cd Backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## GCP Deployment Guide

The recommended deployment path for this assignment is one GCP Compute Engine VM running Docker.

1. Create a Compute Engine VM with Ubuntu 22.04 LTS.
2. Use `e2-medium` for a smoother Docker build and demo.
3. Open firewall ports `3000` for frontend and `8001` for backend.
4. SSH into the VM.
5. Install Docker, Docker Compose, and Git.
6. Clone the GitHub repository.
7. Build and start PostgreSQL, backend, and frontend with Docker Compose.
8. Run migrations and seed data.
9. Verify the deployed URLs above.

VM setup commands:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo usermod -aG docker $USER
```

After reconnecting to SSH:

```bash
docker ps
docker-compose --version
```

Deploy the app:

```bash
git clone https://github.com/ssshivam1206/TractUs_Assignment.git
cd TractUs_Assignment
NEXT_PUBLIC_API_BASE_URL=http://136.114.175.127:8001 docker-compose up --build -d
```

Run database setup:

```bash
docker-compose run --rm backend npx prisma migrate deploy
docker-compose run --rm backend npm run db:seed
```

If old Docker Compose v1 hits `KeyError: ContainerConfig` while recreating a service, remove the exited service container and run `docker-compose up -d` again.

## Test Commands

Backend:

```bash
cd Backend
npm run lint
npm run build
npm test
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Note: On the local Windows machine used during development, `next build` can fail after compilation with `spawn EPERM`. Frontend lint passes locally, and the production build should also be verified on the deployment VM or CI environment.

## API Reference

Swagger UI is available at:

```text
http://136.114.175.127:8001/docs
```

OpenAPI JSON is available at:

```text
http://136.114.175.127:8001/docs/openapi.json
```

## Project Structure

```text
TractUs_Assignment/
  Backend/        Backend API, Prisma schema, tests, backend README
  frontend/       Next.js frontend, frontend README
  docker-compose.yml
  README.md
```

## Supporting Docs

- Backend details: `Backend/README.md`
- Frontend details: `frontend/README.md`