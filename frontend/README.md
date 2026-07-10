# TractUs Frontend

Next.js frontend for the TractUs Contract Operations Console assignment.

## What it does

- loads organisations from the backend
- stores the active organisation in local storage
- lists organisation-scoped contracts with backend search, filtering, and pagination
- creates contracts from structured JSON
- shows contract detail, draft editing, workflow actions, and audit trail
- listens for SSE contract events and refreshes the UI across tabs

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env.local
```

3. Point the frontend to the backend API:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

4. Start the dev server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Reviewer flow

1. Start the backend first.
2. Make sure PostgreSQL contains at least one organisation.
3. Open the frontend.
4. Select an organisation.
5. Review the contract list.
6. Create a contract from the JSON screen if needed.
7. Open a contract detail page to test edit, finalize, archive, audit trail, and realtime refresh.

## Current status against the plan

Completed:

- Phase 1 to Phase 9 implementation work
- organisation selection
- contract list
- contract create flow
- contract detail and draft editing
- workflow actions
- audit trail
- realtime refresh
- UX polish pass

Still left:

- Phase 10 frontend automated tests
- Phase 11 deployment and deployment notes
