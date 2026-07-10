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
- seeds demo organisations, contracts, and audit history for review

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

6. Seed the demo data:

```bash
npm run db:seed
```

7. Start the backend:

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
npm run db:seed
```

## Seed data

The seed command creates:

- 2 organisations
- 5 contracts across both organisations
- mixed DRAFT, FINALIZED, and ARCHIVED statuses
- matching audit trail entries for seeded lifecycle changes

The script is deterministic and only replaces its own demo contract and event records, so rerunning it is safe for local review.

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

- Phase 1 to Phase 10 core backend implementation
- organisation and contract APIs
- validation rules
- search, filter, and pagination
- workflow actions
- audit trail
- SSE updates
- repeatable demo seed data
- backend tests for core behavior

Still left:

- Phase 11 deployment and production deployment notes
- final reviewer-oriented deployment verification steps
