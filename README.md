## MicroCourses - Mini LMS (Problem 4)

### API Summary

- Auth
  - POST `/api/auth/register` (Idempotency-Key supported)
  - POST `/api/auth/login`
- Meta/Health/Manifest
  - GET `/api/health` → `{ ok: true }`
  - GET `/api/_meta` → `{ name, version }`
  - GET `/api/.well-known/hackathon.json`
- Creator
  - POST `/api/creator/apply`
  - GET `/api/creator/dashboard`
- Courses
  - GET `/api/courses?limit=&offset=` → `{ items, next_offset }`
  - GET `/api/courses/:id` → `{ course, lessons }`
  - POST `/api/courses` (Creator) → draft
  - PUT `/api/courses/:id` (Creator)
  - POST `/api/courses/:id/lessons` (Creator) → auto transcript, unique order
  - POST `/api/courses/:id/submit` (Creator)
- Admin
  - GET `/api/admin/review/creators`
  - POST `/api/admin/review/creators/:id/approve`
  - GET `/api/admin/review/courses`
  - POST `/api/admin/review/courses/:id/approve`
- Learner
  - POST `/api/learn/enroll`
  - POST `/api/learn/complete`
  - GET `/api/learn/progress/:courseId`
  - POST `/api/learn/certificate` → `{ certificate: { serial_hash } }`
- Lessons
  - GET `/api/lesson/:id` → lesson with transcript

### Example Requests

```bash
# Health
curl -s http://localhost:3000/api/health

# Register (idempotent)
curl -s -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: abc-123' \
  -d '{"email":"user1@example.com","password":"pass123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"learner@example.com","password":"learner123"}' | jq -r .token)

# List published courses
curl -s http://localhost:3000/api/courses?limit=10
```

### Test Credentials

- Admin: `admin@example.com` / `admin123`
- Creator: `creator@example.com` / `creator123`
- Learner: `learner@example.com` / `learner123`

### Seed Data

Run:

```bash
cd server && npm run seed
```

Creates one published course with two lessons.

### Pagination

- All list endpoints accept `limit` and `offset`. Response returns `{ items, next_offset }` where `next_offset` is null when no more items.

### Idempotency

- All create POSTs accept `Idempotency-Key` header. Replays return the original response.

### Rate Limits

- Enforced at 60 req/min per user (by JWT `sub`) or IP. Exceeding returns `429 { "error": { "code": "RATE_LIMIT" } }`.

### Errors (Uniform JSON)

```json
{ "error": { "code": "FIELD_REQUIRED", "field": "email", "message": "Email is required" } }
```

### CORS

- CORS is open for judging via `cors()` middleware.

### Authentication

- JWT Bearer tokens. Endpoints: `/api/auth/register`, `/api/auth/login`. Roles: Learner, Creator, Admin.

### Architecture (~150 words)

Node.js (Express 5) serves a REST API backed by SQLite via `better-sqlite3` (synchronous, transaction-safe). The schema models users, creator applications, courses, lessons (with unique `order_index` per course), enrollments, lesson progress, and certificates. Middleware provides open CORS, Helmet hardening, request logging, uniform JSON errors, 60 req/min rate limiting keyed by user or IP, and POST idempotency using an in-memory store. Auth uses JWTs; role guards enforce Creator/Admin routes. Auto-transcripts are generated server-side from lesson `content` using a simple summarization/keyword extraction heuristic. Pagination follows `limit`/`offset` with `next_offset`. A minimal React client (Vite) exercises the flows: browse courses, enroll, learn lessons, track progress, apply as creator, creator dashboard (create, add lesson, submit), and admin review (approve creators, publish courses). Seed script provisions test users and a published sample course. Health/meta/manifest endpoints satisfy judging checks.

### Running Locally

```bash
# Terminal 1
cd server && npm run seed && npm run dev

# Terminal 2
cd client && npm run dev
```
