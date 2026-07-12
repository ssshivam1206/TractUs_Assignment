# TractUs Backend

Node.js and Express backend for the TractUs Contract Operations Console assignment.

## What It Does

- Stores organisation-scoped contracts in PostgreSQL
- Validates structured contract JSON payloads
- Supports contract CRUD with draft-only update and delete rules
- Enforces the `DRAFT -> FINALIZED -> ARCHIVED` workflow
- Records audit events for create, update, finalize, archive, and delete
- Supports backend search, filter, and pagination
- Publishes contract realtime events through SSE
- Serves OpenAPI JSON and Swagger UI docs
- Accepts contract-scoped PDF attachments with local file storage
- Seeds demo organisations, contracts, and audit history for review

## Tech Stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Zod
- Multer
- Vitest

## Environment Variables

```env
PORT=8001
DATABASE_URL=postgresql://postgres:postgres@localhost:5438/tractus_backend
UPLOADS_DIR=uploads
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env
```

3. Generate the Prisma client:

```bash
npm run db:generate
```

4. Run migrations:

```bash
npm run db:migrate
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start the backend:

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:8001
```

## Docker Compose Setup

From the repo root, start PostgreSQL and backend:

```bash
docker compose up --build -d
```

For older Docker Compose installations:

```bash
docker-compose up --build -d
```

Run production-style migrations:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

Seed demo data:

```bash
docker compose run --rm backend npm run db:seed
```

Notes:

- PostgreSQL is exposed on `localhost:5438`
- Backend is exposed on `http://localhost:8001`
- Uploaded PDFs persist in the Docker volume `tractus_backend_uploads`

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Seed Data

The seed command creates:

- 2 organisations
- 10 contracts total, split across the 2 demo organisations
- Mixed `DRAFT`, `FINALIZED`, and `ARCHIVED` statuses
- Matching audit trail entries for seeded lifecycle changes

The seed script is deterministic and can be rerun safely for local review.

## API Docs

```text
Swagger UI: GET /docs
OpenAPI JSON: GET /docs/openapi.json
```

The organisation-scoped contract routes require the `x-organisation-id` header.

## Key Routes

```text
GET    /health
GET    /docs
GET    /docs/openapi.json
GET    /organisations
POST   /organisations
GET    /contracts
POST   /contracts
GET    /contracts/:id
PATCH  /contracts/:id
DELETE /contracts/:id
POST   /contracts/:id/finalize
POST   /contracts/:id/archive
GET    /contracts/:id/events
GET    /contracts/:id/attachments
POST   /contracts/:id/attachments
GET    /events/contracts
```

## PDF Attachment Notes

- Only `application/pdf` is accepted
- Maximum upload size is `10 MB`
- Files are stored under `UPLOADS_DIR`
- Metadata is stored in PostgreSQL through the `ContractAttachment` table
- Attachments are scoped by both contract and organisation

## Verification

```bash
npm run lint
npm run build
npm test
```
