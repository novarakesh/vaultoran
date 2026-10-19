# TrustVault Threat Model & Security Mitigations

This document outlines the core threat vectors considered during the architectural design of **TrustVault**, their potential blast radius, and the defense-in-depth mitigations implemented across the platform.

---

## 1. Direct URL Guessing / IDOR (Insecure Direct Object Reference)

### Threat Description
An attacker observes sequential or predictable resource identifiers (e.g., `/api/documents/104`) or attempts to enumerate random identifiers (UUIDs/ObjectIds) to download unauthorized confidential files directly or view unauthorized metadata.

### Impact
Unauthorized disclosure of confidential intellectual property, financial records, or legal documents.

### Mitigation
- **Non-Static File Access**: Storage directories are kept strictly private on the filesystem outside the public web server directory. No public URL routes or static web servers (`express.static`) map to document files.
- **Per-Request Authorization Middleware (`authorizeDocumentAccess`)**: Every request for document metadata, download, modification, or sharing is intercepted by `authorizeDocumentAccess`.
  - Access is evaluated against the authenticated user's ID and role.
  - Allowed entities are strictly limited to: (1) System `admin`, (2) Document `owner`, or (3) Explicitly shared user in `sharedWith` with corresponding permission level (`read` or `edit`).
- **Automated Intrusion Detection & Audit**: Any unauthorized request is blocked with `HTTP 403 Forbidden` and immediately records an immutable `VIEW_ATTEMPT_DENIED` audit log capturing user ID, document ID, IP address, user-agent, and denial reasons.
- **Non-Enumerable Cryptographic File Names**: Files are saved on disk with 64-character cryptographic random hex names (`crypto.randomBytes(32).toString('hex')`), decoupling disk paths from database IDs.

---

## 2. Audit Log Tampering & Repudiation

### Threat Description
A compromised account, insider threat, or malicious actor who gains partial database access attempts to modify, update, or purge audit trail records to cover their tracks after exfiltrating documents.

### Impact
Loss of forensic integrity, inability to detect breaches, and regulatory non-compliance.

### Mitigation
- **Mongoose Schema Pre-Hook Enforcement**: The `AuditLog` Mongoose schema strictly implements append-only immutability.
- Pre-hooks on all update and delete methods (`updateOne`, `updateMany`, `findOneAndUpdate`, `findOneAndDelete`, `deleteOne`, `deleteMany`, `replaceOne`, `save` on existing records) throw an uncatchable `ImmutableAuditLogError`:
  ```javascript
  const rejectAuditModification = function (next) {
    const err = new Error('Security Violation: Audit logs are strictly immutable and cannot be modified or deleted.');
    err.name = 'ImmutableAuditLogError';
    return next(err);
  };
  ```
- **Privilege Segregation**: The `/api/audit` query route is strictly restricted to the `admin` role and supports read-only operations with pagination and filtering.

---

## 3. Stale Tokens & Token Replay (Session Hijacking)

### Threat Description
A user logs out, is decommissioned, or changes credentials, but an attacker holding a valid, unexpired JWT (e.g., captured via XSS, MITM, or leaked logs) continues to access protected documents until token expiration.

### Impact
Persistent unauthorized access by rogue actors or terminated employees.

### Mitigation
- **Instant Revocation via `tokenVersion`**:
  - Each `User` record maintains a numeric `tokenVersion` (default 0).
  - Every issued JWT embeds `{ id, role, tokenVersion }`.
  - The `verifyToken` middleware queries the database and verifies `decoded.tokenVersion === user.tokenVersion`.
  - If a user invokes `POST /api/auth/logout-all` or an administrator triggers `PATCH /api/users/:id/revoke`, `tokenVersion` is atomically incremented by 1.
  - All existing tokens for that user immediately fail validation (`HTTP 401 Session has been revoked`), providing immediate global session invalidation without maintaining an in-memory token blacklist.

---

## 4. Privilege Escalation & Role Creep

### Threat Description
- A malicious user attempts to register as an `admin` during the self-service sign-up process.
- A user with `viewer` role attempts to modify document shares or soft-delete documents.
- A user with `read` permission on a document attempts to share or delete it.

### Impact
Unauthorized administration, privilege creep, and document destruction.

### Mitigation
- **Self-Service Role Restriction**: `POST /api/auth/register` explicitly forbids assigning the `admin` role. Requests containing `role: 'admin'` are rejected with `HTTP 400 Bad Request`. Only `owner` and `viewer` can be selected (defaulting to `viewer`).
- **Multi-Tiered Middleware**:
  1. `verifyToken` authenticates identity.
  2. `authorizeRole('admin', 'owner')` enforces broad operational privilege.
  3. `authorizeDocumentAccess('edit')` enforces document-level ownership or edit rights.
- A read-only viewer cannot share or delete documents, receiving `HTTP 403`.

---

## 5. Storage Path Traversal

### Threat Description
An attacker crafts a malicious request containing relative path traversals (e.g., `../../etc/passwd` or `..\\Windows\\System32\\cmd.exe`) in file download or document path parameters.

### Impact
Arbitrary file read on the host operating system.

### Mitigation
- **Deterministic Path Canonicalization**: When reading or streaming files, the storage path is resolved using `path.resolve(doc.filePath)`.
- The system enforces that `resolvedPath.startsWith(path.resolve(config.storageDir))` before opening any read stream.
- The client cannot supply a custom filename or file path parameter; the path is retrieved directly from verified database records.

---

## 6. File Tampering & Bit-Rot Detection

### Threat Description
A rogue system administrator or malware with local disk access modifies the contents of stored documents in the vault without updating database records.

### Impact
Presentation of poisoned, falsified, or trojanized documents to legitimate users.

### Mitigation
- **SHA-256 Cryptographic Integrity Check on Upload**: When a file is uploaded, its cryptographic SHA-256 checksum is computed using Node.js `crypto` streaming and stored immutably in `Document.fileHash`.
- **Pre-Streaming Integrity Verification**: On every download request (`GET /api/documents/:id/download`), the server computes the current SHA-256 hash of the disk file before sending the first byte. If the hash does not match `fileHash`:
  - Streaming is aborted immediately.
  - `HTTP 500 Document integrity check failed` is returned.
  - A critical alert is logged to prevent exfiltration of tampered files.

---

## 7. Brute Force & Denial of Service (DoS)

### Threat Description
An attacker performs credential stuffing or brute force password guessing against the login endpoint, or floods document streaming endpoints to exhaust bandwidth and server resources.

### Impact
Account takeover, server unavailability, and resource exhaustion.

### Mitigation
- **Tiered Rate Limiting**:
  - Sensitive auth endpoints (`/api/auth/login`) are protected by `express-rate-limit` allowing a maximum of 10 attempts per 15-minute window per IP.
  - General API endpoints are limited to 200 requests per 15 minutes.
- **Payload Limits**: Request bodies are capped at 10MB to prevent memory bloat attacks.
- **Password Hashing**: Passwords are hashed using bcrypt with salt rounds of 12, adding computational resistance to offline cracking.

---

## 8. MIME Sniffing & Malicious Executable Uploads

### Threat Description
An attacker uploads an executable binary or HTML with embedded JavaScript masked as a PDF or image, hoping a browser executes it in the application's origin context.

### Impact
Cross-Site Scripting (XSS), Drive-by downloads, or remote code execution.

### Mitigation
- **Strict File Type Whitelisting**: Multer middleware checks both MIME type and file extension against a strict whitelist (PDF, DOCX, XLSX, TXT, CSV, JPG, PNG, WEBP). Executables (`.exe`, `.sh`, `.bat`, `.js`, `.html`) are rejected.
- **Security Headers on Downloads**:
  - `X-Content-Type-Options: nosniff` forces browsers to honor the declared MIME type.
  - `Content-Disposition: attachment; filename="..."` enforces download rather than inline execution in insecure contexts.
  - `Content-Security-Policy: default-src 'none'` disables script execution.

---

## Summary of Defense Layers

| Threat Vector | Primary Defense Layer | Fallback / Monitoring Layer |
| :--- | :--- | :--- |
| **Direct URL Guessing** | `authorizeDocumentAccess` middleware | `VIEW_ATTEMPT_DENIED` audit log |
| **Audit Log Tampering** | Mongoose pre-hook rejection (`updateOne`, `deleteOne`) | Database user permission hardening |
| **Stale JWT Replay** | `tokenVersion` check on every request | Short token expiration (`24h`) |
| **Privilege Escalation** | `authorizeRole` + `authorizeDocumentAccess` | Self-service admin registration blocked |
| **Path Traversal** | Canonical path prefix verification | Randomized disk storage paths |
| **File Tampering** | SHA-256 pre-streaming hash verification | Private vault filesystem permissions |
| **Brute Force** | `express-rate-limit` on login | bcrypt (12 rounds) |
| **MIME Sniffing** | Extension & MIME whitelist | `nosniff` & attachment header enforcement |
