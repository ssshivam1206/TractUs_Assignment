# TractUs Frontend

Next.js frontend for the TractUs Contract Operations Console assignment.

## What It Does

- Loads organisations from the backend
- Stores the active organisation in local storage
- Lists organisation-scoped contracts with backend search, filtering, and pagination
- Creates contracts from structured JSON
- Shows contract detail, draft editing, workflow actions, and audit trail
- Displays PDF attachments on the contract detail page
- Listens for SSE contract events and refreshes the UI across tabs

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4

## Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

For deployed GCP VM usage:

```env
NEXT_PUBLIC_API_BASE_URL=http://YOUR_GCP_VM_EXTERNAL_IP:8001
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

The backend must be running before using the frontend.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Reviewer Flow

1. Start the backend and PostgreSQL.
2. Seed demo data.
3. Open the frontend.
4. Select `Demo Org A` or `Demo Org B`.
5. Review the contract list.
6. Search, filter, and paginate contracts.
7. Create a contract from structured JSON.
8. Open a contract detail page.
9. Edit a draft contract and save changes.
10. Finalize and archive contracts through workflow actions.
11. Review audit trail updates.
12. Open the same contract in another tab to verify realtime refresh.
13. Upload and view PDF attachments from the detail page.

## Verification

```bash
npm run lint
npm run build
npm test
```

Note: On the local Windows development machine, `next build` can fail after successful compilation with `spawn EPERM`. Verify production build on the GCP VM or CI environment before final submission.
