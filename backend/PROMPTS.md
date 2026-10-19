# TrustVault AI Prompt & Engineering Audit Log

This document tracks prompts provided to the AI system, mistakes or nuances observed during implementation, and human corrections/adjustments made.

---

## Log Entry 1: Initial Architecture & Backend Core Security Implementation

### Date
2026-10-19

### Prompt Submitted
```markdown
You are an expert full-stack MERN security architect. Build the BACKEND ONLY of "TrustVault", a high-security confidential document sharing platform, in a `backend/` folder. The frontend comes later, after I deploy the backend to Render and give you the live URL.

## Stack
Node.js, Express, Mongoose, JWT, bcrypt, multer, Jest + Supertest (with mongodb-memory-server for tests).

## Secrets (critical)
- NEVER hard-code credentials. Read everything from environment variables.
- Provide `.env.example` with: PORT, MONGODB_URI=<your-atlas-uri>, JWT_SECRET, JWT_EXPIRES_IN, STORAGE_DIR, CORS_ORIGIN, MAX_FILE_SIZE_MB.
- `.gitignore` must exclude `.env`, `node_modules`, and `storage/`.

## Structure
backend/
  src/config/ (db.js, env.js)
  src/models/ (User.js, Document.js, AuditLog.js)
  src/middleware/ (verifyToken.js, authorizeRole.js, authorizeDocumentAccess.js, errorHandler.js, rateLimit.js)
  src/routes/ (auth.js, documents.js, users.js, audit.js)
  src/controllers/, src/utils/ (hash.js, audit.js)
  src/app.js (exports app, no listen), src/server.js
  storage/ (private, outside any static serving)
  tests/security.test.js
  seed script creating one admin, one owner, two viewers (passwords from env)
  README.md with Render deploy steps
  THREATS.md, PROMPTS.md

## Roles
Strictly `admin`, `owner`, `viewer`. Registration can never self-assign admin.

## Schemas
- User: name, email (unique, lowercase), passwordHash, role, tokenVersion (Number, default 0).
- Document: title, category, owner (ref User), filePath (crypto-random filename, stored in private storage dir), originalName, mimeType, size, fileHash (SHA-256 computed on upload), sharedWith [{ user: ref, permission: 'read'|'edit' }], isDeleted (soft delete), timestamps.
- AuditLog: user, action enum (UPLOAD, DOWNLOAD, VIEW_ATTEMPT_DENIED, PERMISSION_CHANGE, DELETE, LOGIN), document, ip, userAgent, metadata, timestamp. Immutable and append-only: pre-hooks on updateOne, updateMany, findOneAndUpdate, findOneAndDelete, deleteOne, deleteMany, replaceOne, and save on existing docs must throw.

## Middleware
- verifyToken: validate Bearer JWT, load user, reject if token.tokenVersion !== user.tokenVersion (instant revocation). Return 401.
- authorizeRole(...roles).
- authorizeDocumentAccess(requiredPermission): checked on EVERY document request. Allow only admin, the owner, or a user in sharedWith with sufficient permission. Otherwise return HTTP 403 and write a VIEW_ATTEMPT_DENIED audit log. Treat soft-deleted docs as not found for non-admins.

## Endpoints
- POST /api/auth/register, POST /api/auth/login (writes LOGIN audit, rate-limited), POST /api/auth/logout-all (increments tokenVersion), GET /api/auth/me
- POST /api/documents (owner/admin; multer upload; random filename; compute SHA-256; UPLOAD audit; file type/size whitelist)
- GET /api/documents (list only docs the user may access; filter by q (title), category, owner, date range)
- GET /api/documents/:id/download (permission check first, verify fileHash integrity, stream the file, DOWNLOAD audit; no public static URL)
- PUT /api/documents/:id/share (owner/admin; add/update/remove shares; PERMISSION_CHANGE audit)
- DELETE /api/documents/:id (owner/admin; soft delete; DELETE audit)
- GET /api/users (owner/admin; for share picker, minimal fields)
- PATCH /api/users/:id/revoke (admin; increments tokenVersion)
- GET /api/audit (admin only; paginated, filterable)
- GET /api/health

## Hardening
helmet, strict CORS from CORS_ORIGIN, express-rate-limit, express-mongo-sanitize, input validation (express-validator or zod), generic error messages, no stack traces in production, Content-Disposition and nosniff headers on downloads, path traversal protection.

## Tests (backend/tests/security.test.js)
Prove with Supertest:
1. Unauthenticated request returns 401.
2. A viewer with no share gets 403 on download, and a VIEW_ATTEMPT_DENIED log is created.
3. A read-only viewer cannot edit or share (403).
4. Owner of another document gets 403.
5. Admin and owner get 200.
6. A shared viewer gets 200.
7. A stale token (after tokenVersion increment) returns 401.
8. AuditLog update/delete attempts throw.
9. Tampered file fails the hash integrity check.
```

### AI Errors / Nuances Noticed
1. **Supertest Binary Response Parsing Nuance**:
   - *Observation*: During initial execution of Test 6, Supertest treated `application/pdf` download streams as raw binary buffers in `res.body` rather than populating `res.text`. As a result, asserting against `res.text` directly produced `undefined`.
   - *Resolution*: Updated test assertion to support both string text and binary buffers: `res.text || (Buffer.isBuffer(res.body) ? res.body.toString() : '')`.
2. **Windows PowerShell Shell Syntax**:
   - *Observation*: In Windows PowerShell, passing multiple positional arguments to `mkdir` alias failed (`mkdir backend frontend`).
   - *Resolution*: Handled directory creation using Node.js filesystem tools and ensured automated parent directory resolution.
3. **Mongoose Immutability Hooks on Documents vs Queries**:
   - *Observation*: Mongoose provides both document-level (`deleteOne`, `save`) and query-level (`updateOne`, `findOneAndUpdate`, `deleteOne`, `deleteMany`) methods.
   - *Resolution*: Bound pre-hooks to both `{ document: true, query: true }` contexts to ensure no evasion technique can bypass audit log immutability.

### Human Corrections & Feedback (Fill Below)
- **User Correction 1**: _[Document your observations, corrections, or adjustments here]_
- **User Correction 2**: _[Document your observations, corrections, or adjustments here]_

---

## Template for Subsequent Prompts

```markdown
### Date: [YYYY-MM-DD]
### Prompt:
[Insert prompt text here]

### Intent / Feature Focus:
[E.g., Frontend Implementation / Deployment to Render / MFA / etc.]

### Observations & Adjustments:
- AI Generated Behavior:
- Discrepancy Observed:
- Human Correction Made:
```
