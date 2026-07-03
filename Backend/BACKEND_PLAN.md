# TractUs Assignment Backend Plan

## 1. Goal

Build the backend for the TractUs contract operations console as a standalone Node.js service that:

- stores organisation-scoped contract data in PostgreSQL
- validates contract JSON payloads
- supports contract CRUD and lifecycle actions
- records an audit trail for every important action
- exposes search, filter, and pagination from the backend
- pushes live status updates with SSE
- is deployed and ready for frontend integration later

This plan is backend-only. The frontend will live in a separate repository under the same parent folder.

Project startup rule: we will build this step by step, and we will only add files, scripts, dependencies, and environment variables when we actually use them in the current phase. If a feature is not part of the current implementation, we will not add it to the repo or mention it as active setup until we reach that phase.

---

## 2. Working Folder Structure

Use one parent folder on your machine and keep two separate Git repositories inside it:

```text
TractUs_Assignment/
  backend/    <- backend repo
  frontend/   <- frontend repo later
```

Recommended backend repo layout:

```text
backend/
  src/
    modules/
      organisations/
      contracts/
      audit/
      realtime/
      seed/
    common/
    config/
  prisma/
  tests/
  docs/
  .env.example
  package.json
  tsconfig.json
  README.md
```

This keeps the backend independent, the Git history clean, and the frontend separate from day one.

---

## 3. Tech Stack

Use one stack only, so the plan stays simple and reviewable:

- Runtime: Node.js
- Framework: Express
- Language: TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Validation: Zod
- Real-time: SSE
- Testing: Vitest or Jest
- Deployment: Render for API and managed PostgreSQL

Why this stack:

- TypeScript reduces API and schema mistakes
- Express keeps the service lightweight
- Prisma makes PostgreSQL schema work cleaner
- Zod gives consistent validation on input
- SSE is enough for live contract status updates

---

## 4. Backend Scope

The backend must support:

- organisation-scoped contract creation and retrieval
- contract JSON validation
- draft-only update and delete
- lifecycle workflow:
  - `DRAFT`
  - `FINALIZED`
  - `ARCHIVED`
- audit trail for create, update, status change, and delete
- search by client name, contract ID, and status
- pagination
- real-time status change updates
- seed data for demo and evaluation

The backend must not depend on the frontend repo.

---

## 5. Phase-by-Phase Build Plan

### Phase 1: Repo Setup

Goal: create a clean backend repo and make it runnable locally.

Steps:

1. Initialise Git inside `backend/` only.
2. Create the Node.js project.
3. Add TypeScript configuration.
4. Add linting and formatting.
5. Add scripts for:
   - `dev`
   - `build`
   - `start`
   - `test`
   - `lint`
   - `db:generate`
   - `db:migrate`
6. Add `.env.example`.
7. Add a basic health route.

Deliverable:

- backend starts locally
- Git history has the first setup commit

Suggested commit:

- `chore: initialise backend repository`

---

### Phase 2: Database Design

Goal: define the data model before writing business logic.

Tables:

- `organisations`
- `contracts`
- `contract_events`

Core contract fields:

- `id`
- `organisation_id`
- `client_name`
- `po_ref_no`
- `po_date`
- `status`
- `field_data` as `JSONB`
- `created_at`
- `updated_at`
- `finalized_at`
- `archived_at`
- `deleted_at`

Audit fields:

- `id`
- `contract_id`
- `organisation_id`
- `event_type`
- `before_state`
- `after_state`
- `created_at`

Indexes to add:

- `(organisation_id, status)`
- `(organisation_id, client_name)`
- `(organisation_id, po_ref_no)`
- `(organisation_id, created_at)`

Deliverable:

- Prisma schema or equivalent DB schema ready
- migration created

Suggested commit:

- `feat(db): add organisations contracts and audit schema`

---

### Phase 3: Validation Rules

Goal: lock the contract input format and business rules.

Validation requirements:

- `client_name` required
- `po_ref_no` required
- `po_date` required and must follow `YYYY-MM-DD`
- `items` required and must be a non-empty array
- each item must include:
  - `description`
  - `quantity > 0`
  - `unit_price >= 0`

Business validation:

- only contracts in the selected organisation are allowed
- only draft contracts can be updated or deleted
- status transitions must be valid
- invalid transitions must return `409 Conflict`

Deliverable:

- shared validation schema in place
- clear validation error response format defined

Suggested commit:

- `feat(api): add contract validation rules`

---

### Phase 4: Organisation and Contract CRUD

Goal: implement the core REST API.

Build these endpoints:

- `POST /contracts`
- `GET /contracts`
- `GET /contracts/:id`
- `PATCH /contracts/:id`
- `DELETE /contracts/:id`

Rules:

- all routes must be organisation-scoped
- contract creation stores the JSON payload in `field_data`
- update works only for `DRAFT`
- delete works only for `DRAFT`
- delete is soft delete using `deleted_at`

Deliverable:

- contracts can be created, listed, read, edited, and deleted correctly

Suggested commit:

- `feat(api): add contract crud endpoints`

---

### Phase 5: Search, Filter, and Pagination

Goal: make the backend support the list page properly.

Requirements:

- status filter
- client name partial search
- contract ID search
- pagination
- backend-driven sorting

Recommended rules:

- client name search is case-insensitive
- contract ID search is exact
- default sort is `updated_at desc`
- default page is `1`
- default limit is `10`
- max limit should be capped, for example at `50`

Deliverable:

- list endpoint supports real backend search and pagination

Suggested commit:

- `feat(api): add search filter and pagination`

---

### Phase 6: Workflow Actions

Goal: implement the contract status lifecycle.

Actions:

- finalize a draft contract
- archive a finalized contract

Rules:

- `DRAFT -> FINALIZED`
- `FINALIZED -> ARCHIVED`
- anything else should be rejected with `409 Conflict`

Lifecycle fields:

- set `finalized_at` when finalized
- set `archived_at` when archived

Deliverable:

- workflow is enforced on the server

Suggested commit:

- `feat(api): add contract workflow actions`

---

### Phase 7: Audit Trail

Goal: track every meaningful change.

Audit events to store:

- create
- update
- finalize
- archive
- delete

For each audit record store:

- event type
- contract snapshot before change
- contract snapshot after change
- organisation reference
- timestamp

API to expose:

- `GET /contracts/:id/events`

Deliverable:

- every contract has a readable change history

Suggested commit:

- `feat(api): add contract audit trail`

---

### Phase 8: Real-Time Updates

Goal: push live status changes to connected clients.

Use SSE for:

- contract finalized events
- contract archived events
- optional contract updated and deleted events

Event schema:

- `event_name`
- `contract_id`
- `organisation_id`
- `old_status`
- `new_status`
- `updated_at`
- `client_name`

Recommended endpoint:

- `GET /events/contracts`

Deliverable:

- open browser sessions can receive live contract updates

Suggested commit:

- `feat(api): add sse contract updates`

---

### Phase 9: Seed Data

Goal: make the app easy to evaluate.

Seed:

- at least 2 organisations
- at least 5 contracts
- contracts in mixed statuses:
  - draft
  - finalized
  - archived

Deliverable:

- reviewer can open the app and immediately see real data

Suggested commit:

- `feat(seed): add organisations and contracts`

---

### Phase 10: Tests

Goal: prove the backend rules work.

Minimum test coverage:

- valid contract creation
- invalid JSON validation
- organisation scoping
- draft-only update
- draft-only delete
- valid status transitions
- invalid status transitions
- audit event creation
- search/filter/pagination
- SSE event path if practical

Deliverable:

- tests give confidence the workflow is correct

Suggested commit:

- `test: add backend workflow coverage`

---

### Phase 11: Deployment

Goal: ship the backend to a cloud target.

Recommended deployment target:

- Render for API deployment
- managed PostgreSQL for the database

Deployment steps:

1. connect the backend repo to the deployment platform
2. create the production database
3. configure environment variables
4. run migrations on deploy
5. deploy the API
6. verify health endpoint and key contract routes
7. copy the deployed API URL into the README

Production checks:

- CORS should allow the future frontend origin
- env vars must match local names
- database connection must be stable
- SSE endpoint must work in production

Deliverable:

- deployed backend URL is available for frontend integration

Suggested commit:

- `docs: add deployment instructions`

---

## 6. API Contract Rules

Use a predictable response style for all endpoints.

Recommended success response shape:

```json
{
  "success": true,
  "data": {}
}
```

Recommended error response shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid contract payload",
    "details": []
  }
}
```

HTTP behavior:

- `400` for validation errors
- `404` for missing resources or cross-organisation access
- `409` for invalid workflow transitions
- `500` for unexpected server errors

---

## 7. Definition of Done

Backend is done only when all of this is true:

- repo is clean and separate from frontend
- backend runs locally with TypeScript
- database schema is complete
- contract creation and listing work
- update and delete are draft-only
- workflow rules are enforced
- audit trail is stored and readable
- search/filter/pagination work from the backend
- SSE updates work
- seed data is present
- tests pass
- backend is deployed
- README explains setup, env vars, and deployment

---

## 8. Commit History Plan

Keep commits small and meaningful:

1. `chore: initialise backend repository`
2. `chore: add typescript and project tooling`
3. `feat(db): add organisations contracts and audit schema`
4. `feat(api): add contract validation rules`
5. `feat(api): add contract crud endpoints`
6. `feat(api): add search filter and pagination`
7. `feat(api): add contract workflow actions`
8. `feat(api): add contract audit trail`
9. `feat(api): add sse contract updates`
10. `feat(seed): add organisations and contracts`
11. `test: add backend workflow coverage`
12. `docs: add deployment instructions`

This history will look deliberate and senior-level.

---

## 9. Suggested Start Here Checklist

If starting today, do these first:

1. initialise the backend repo
2. add Express + TypeScript project scaffolding
3. set up Prisma and PostgreSQL connection
4. create `organisations`, `contracts`, and `contract_events`
5. implement contract validation
6. build create and list APIs
7. add audit trail and status workflow

That is the fastest path to a solid first milestone.

