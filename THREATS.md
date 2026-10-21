# Security & Threat Model — Vaultoran

**Author:** Nova Rakesh  
**Project:** Vaultoran (Zero-Trust Document Vault)

---

### Core Security Approach
I designed Vaultoran around a **Zero-Trust** model:
- Files are never stored in a public folder or served statically.
- Every read, download, and edit requires authentication and document-level permission.
- Audit logs are strictly append-only so they cannot be wiped after an incident.
- Tokens can be revoked globally in 0ms without running Redis.

---

### Key Threats Handled

#### 1. Unauthorized Access & IDOR (Guessing URLs)
- **Risk:** A user changes the document ID in the URL (`/api/documents/:id`) to download another team's private file.
- **My Fix:** Every request runs through `authorizeDocumentAccess`. Only the file owner, an admin, or someone explicitly granted clearance can access it. Unauthorized attempts return `403 Forbidden` and write a `VIEW_ATTEMPT_DENIED` log with IP and timestamp.

#### 2. Tampering with Audit Logs
- **Risk:** An attacker or rogue user edits or wipes the audit table to hide their tracks.
- **My Fix:** In `AuditLog.js`, I added Mongoose pre-hooks on document methods and query methods (`updateOne`, `deleteMany`, `findOneAndUpdate`, etc.) that throw an error if anyone tries to modify or delete a record. Logs can only be created, never edited.

#### 3. Stolen or Leaked JWT Tokens
- **Risk:** A token gets leaked or a user is terminated, but their JWT is still valid for hours.
- **My Fix:** Each user has a numeric `tokenVersion` in MongoDB. When a user clicks "Logout All" or an admin revokes an account, `tokenVersion` increments by 1. Since incoming JWTs contain the old number, all active sessions are instantly dead (returns `401 Unauthorized`).

#### 4. Registering as Admin (Privilege Escalation)
- **Risk:** An attacker registers via API with `{ "role": "admin" }`.
- **My Fix:** Server-side validation in `authController.js` blocks any signup containing `role: 'admin'` with HTTP 400. Only `owner` or `viewer` can be selected during signup.

#### 5. File Tampering on the Server Disk
- **Risk:** Someone modifies or replaces a file directly on disk without changing database metadata.
- **My Fix:** I compute a SHA-256 hash when the file is uploaded. Before streaming on download, the server re-calculates the hash on disk. If the hash doesn't match, it aborts immediately with a 500 error.

#### 6. Directory / Path Traversal (`../../`)
- **Risk:** Attacker sends paths with `../` to read server system files.
- **My Fix:** Uploads are given random 32-byte hex names on disk. On download, paths are checked with `path.resolve` to verify they remain strictly inside the storage directory.

#### 7. Brute Force & Credential Stuffing
- **Risk:** Bots spamming the login endpoint.
- **My Fix:** Added `express-rate-limit` capped at 10 requests per 15 minutes on `/api/auth/login`, and passwords hashed with bcrypt (salt rounds = 12).

---

### Verification
I wrote 9 automated security tests in `backend/tests/security.test.js` using Jest and Supertest.
- Tests unauthenticated 401s, IDOR 403 blocks, stale token rejection, audit log freeze, and SHA-256 tamper rejection.
- All 9 tests run and pass automatically (`npm test`).
