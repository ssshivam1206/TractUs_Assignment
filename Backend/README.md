# TractUs Backend

Node.js and Express backend for the TractUs Contract Operations Console assignment.

## What it does

- stores organisation-scoped contracts in PostgreSQL
- validates contract payloads
- supports contract CRUD with draft-only update and delete rules
- enforces the DRAFT -> FINALIZED -> ARCHIVED workflow
- records audit events for create, update, finalize, archive, and delete
- exposes backend search, filter, and pagination
- publishes contract realtime events through SSE

## Tech stack

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Zod
- Vitest

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example:

```bash
cp .env.example .env
```

3. Add your database connection string:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5438/tractus
PORT=4000
```

4. Generate the Prisma client:

```bash
npm run db:generate
```

5. Run migrations:

```bash
npm run db:migrate
```

6. Start the backend:

```bash
npm run dev
```

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run db:generate
npm run db:migrate
```

## Key routes

```text
GET    /health
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
GET    /events/contracts
```

## Current status against the plan

Completed:

- Phase 1 to Phase 8 core backend implementation
- organisation and contract APIs
- validation rules
- search, filter, and pagination
- workflow actions
- audit trail
- SSE updates
- backend tests for core behavior

Still left or not fully formalised:

- Phase 9 seed data as a repeatable seed script or documented seed command
- Phase 11 deployment and production deployment notes
- final reviewer-oriented deployment verification steps
