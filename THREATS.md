# Vaultoran — Threat Model & Security Architecture Analysis

**Author:** Nova Rakesh  
**System:** Vaultoran (Zero-Trust Confidential Document Exchange)  
**Security Framework:** STRIDE Threat Modeling & Defense-in-Depth Architecture  

---

## 1. Executive Summary & Security Philosophy

When architecting **Vaultoran**, my core philosophy was **Zero-Trust**: *never trust, always verify*. Traditional web storage platforms frequently suffer from authorization leakage—relying on obscure URLs, trusting client-side claims, or allowing static file access through web servers.

In Vaultoran:
1. **No file is ever exposed statically**. Every document request is mediated through authorization middleware that validates the user's identity, role, and granular document-level permission.
2. **Audit trails are cryptographically and programmatically immutable**. Not even a compromised system administrator account can alter or delete past access records.
3. **Session revocation is instantaneous and global**. By leveraging an atomic `tokenVersion` counter, compromised credentials or departing team members can be deactivated instantly across all active devices without the overhead of an in-memory token blacklist.
4. **File authenticity is verified before delivery**. SHA-256 cryptographic hashes are computed during upload and re-verified on disk prior to streaming to prevent disk tampering or bit-rot attacks.

---

## 2. STRIDE Threat Vector Analysis & Engineering Defenses

Below is the breakdown of the specific threat vectors I analyzed during design, the real-world attack scenarios considered, and the concrete mitigations I implemented in the codebase.

---

### Threat 1: Insecure Direct Object References (IDOR) & URL Guessing

- **STRIDE Category:** Information Disclosure / Elevation of Privilege
- **Attacker Scenario:** An authenticated viewer observes sequential or predictable resource IDs (e.g. `/api/documents/64f1a...`) and attempts to iterate through other document IDs in an effort to exfiltrate confidential files belonging to other departments or executives.
- **Blast Radius:** Unauthorized disclosure of proprietary intellectual property, board minutes, or legal records.
- **My Architectural Mitigations:**
  1. **Strictly Non-Static Private Storage**: Document files reside in a private directory completely detached from any static web server (`express.static`). No direct URL path to any file exists.
  2. **Per-Request `authorizeDocumentAccess` Middleware**: Every single request for document metadata, download, editing, or sharing executes this middleware. It enforces strict RBAC:
     - System `admin` possesses oversight clearance.
     - Document `owner` possesses full clearance.
     - Any third party must be explicitly declared in `doc.sharedWith` with an appropriate clearance level (`read` or `edit`).
  3. **Automated Intrusion Trapping**: Any unauthorized probe immediately yields an `HTTP 403 Forbidden` response and triggers an immutable `VIEW_ATTEMPT_DENIED` audit log recording the attacker's User ID, document target, client IP, and User-Agent.
  4. **Randomized Disk Filenames**: Files are saved to disk with 64-character cryptographic random hex strings (`crypto.randomBytes(32).toString('hex')`), completely decoupling disk storage tokens from database ObjectIds.

---

### Threat 2: Audit Trail Repudiation & Forensic Tampering

- **STRIDE Category:** Repudiation / Tampering
- **Attacker Scenario:** A rogue insider, disgruntled employee, or attacker who gains access to the database attempts to modify or purge audit log records to conceal unauthorized downloads or permission tampering.
- **Blast Radius:** Loss of forensic integrity, inability to conduct security investigations, and violation of regulatory compliance frameworks (SOC 2, ISO 27001).
- **My Architectural Mitigations:**
  1. **Mongoose Immutability Traps**: The `AuditLog` schema enforces strict append-only behavior. I bound pre-hooks across both document-level methods and query-level mutation methods (`updateOne`, `updateMany`, `findOneAndUpdate`, `findOneAndDelete`, `deleteOne`, `deleteMany`, `replaceOne`, `save` on existing records). Any attempted modification or deletion throws an uncatchable `ImmutableAuditLogError`:
     ```javascript
     const rejectAuditModification = function (next) {
       const err = new Error('Security Violation: Audit logs are strictly immutable and cannot be modified or deleted.');
       err.name = 'ImmutableAuditLogError';
       return next(err);
     };
     ```
  2. **Role Segregation**: The audit log query endpoint (`GET /api/audit`) is strictly restricted to authenticated administrators, supports read-only operations, and returns paginated records.

---

### Threat 3: Stale JWT Replay & Session Hijacking

- **STRIDE Category:** Spoofing
- **Attacker Scenario:** A user's JWT is intercepted (e.g., via network snooping or client-side compromise). The user notices suspicious activity and logs out, or an admin terminates the employee's access. The attacker attempts to replay the still-unexpired JWT to continue exfiltrating confidential documents.
- **Blast Radius:** Persistent unauthorized access even after credential changes or employee termination.
- **My Architectural Mitigations:**
  1. **Atomic `tokenVersion` Invalidation**:
     - Every user document contains a numeric `tokenVersion` field (defaulting to 0).
     - When a token is signed, `{ id, role, tokenVersion }` is embedded into the payload.
     - On every authenticated API request, `verifyToken` loads the user record and asserts:
       ```javascript
       if (decoded.tokenVersion !== user.tokenVersion) {
         return res.status(401).json({ error: 'Session has been revoked. Please re-authenticate.' });
       }
       ```
     - When a user calls `POST /api/auth/logout-all` or an admin calls `PATCH /api/users/:id/revoke`, `tokenVersion` is atomically incremented by 1 (`$inc: { tokenVersion: 1 }`).
     - **Result:** Every previously issued token for that user is invalidated globally across all browsers and devices in 0 milliseconds, with zero need for a stateful Redis token blacklist.

---

### Threat 4: Privilege Escalation & Insecure Registration

- **STRIDE Category:** Elevation of Privilege
- **Attacker Scenario:** During public account creation (`POST /api/auth/register`), an attacker submits `{ "name": "Eve", "email": "eve@evil.com", "role": "admin" }` to grant themselves system administrator privileges.
- **Blast Radius:** Full system compromise, ability to view all files, reassign roles, and inspect all audit logs.
- **My Architectural Mitigations:**
  1. **Strict Registration Boundary**: In `authController.js`, I enforced a hard server-side restriction:
     ```javascript
     if (role === 'admin') {
       return res.status(400).json({
         error: 'Security Violation: Self-assignment of admin role is strictly prohibited.',
       });
     }
     const assignedRole = role === 'owner' ? 'owner' : 'viewer';
     ```
  2. **Tiered Middleware Defense**:
     - Level 1: `verifyToken` (Identity verification)
     - Level 2: `authorizeRole('admin', 'owner')` (Role-level operational authorization)
     - Level 3: `authorizeDocumentAccess('edit')` (Resource-level clearance authorization)

---

### Threat 5: Storage Path Traversal & OS File Disclosure

- **STRIDE Category:** Information Disclosure
- **Attacker Scenario:** An attacker supplies relative directory traversal sequences (such as `../../../../etc/passwd` or `..\\Windows\\System32\\cmd.exe`) in document download or file manipulation endpoints to read arbitrary files from the host server.
- **Blast Radius:** Full server compromise, leak of environment variables, SSH keys, or server source code.
- **My Architectural Mitigations:**
  1. **Deterministic Path Canonicalization**: When accessing a file on disk, the system resolves its full canonical path using `path.resolve()` and explicitly validates that it is strictly bounded inside the designated storage directory:
     ```javascript
     const resolvedPath = path.resolve(doc.filePath);
     const safeStorageDir = path.resolve(config.storageDir);
     if (!resolvedPath.startsWith(safeStorageDir)) {
       return res.status(403).json({ error: 'Access Denied: Path traversal detected.' });
     }
     ```
  2. **No User-Supplied Filenames on Disk**: The client is never allowed to dictate the physical filesystem path or storage filename; paths are generated server-side using cryptographic entropy.

---

### Threat 6: File Tampering & Silent Bit-Rot Detection

- **STRIDE Category:** Tampering
- **Attacker Scenario:** An attacker with local disk access, or malicious software on the host, replaces a legitimate signed contract or financial statement with a forged version without modifying the database record.
- **Blast Radius:** Presentation of forged or compromised documents to legitimate users while claiming authenticity.
- **My Architectural Mitigations:**
  1. **SHA-256 Checksum on Upload**: When a file is uploaded, a cryptographic SHA-256 digest is streamed and stored immutably in `Document.fileHash`.
  2. **Pre-Streaming Integrity Verification**: On every download request (`GET /api/documents/:id/download`), the server re-computes the SHA-256 hash of the on-disk file *before streaming a single byte*:
     ```javascript
     const isIntact = await verifyFileIntegrity(resolvedPath, doc.fileHash);
     if (!isIntact) {
       console.error(`[INTEGRITY FAILURE] File ${doc._id} failed SHA-256 hash verification!`);
       return res.status(500).json({
         error: 'Document integrity check failed. The file on disk does not match the cryptographic integrity hash.',
       });
     }
     ```
     If the checksum does not match, transmission is aborted, preventing the delivery of tampered data.

---

### Threat 7: Credential Stuffing & Denial of Service (DoS)

- **STRIDE Category:** Denial of Service / Spoofing
- **Attacker Scenario:** Automated botnets launch credential-stuffing attacks against `/api/auth/login` or flood document streaming endpoints to exhaust server bandwidth, CPU, and database connections.
- **Blast Radius:** Account takeovers, server unavailability, and high cloud hosting bills.
- **My Architectural Mitigations:**
  1. **Tiered Rate Limiting**:
     - Auth endpoints (`/api/auth/login`) are capped at 10 requests per 15-minute window per IP.
     - General API endpoints are capped at 200 requests per 15 minutes.
  2. **Payload Size Caps**: JSON request bodies are capped at 10MB to prevent memory exhaustion attacks.
  3. **High-Workfactor Password Hashing**: Passwords are encrypted using bcrypt with salt rounds of 12, adding substantial computational resistance to offline brute-force attacks.
  4. **Query Sanitization**: `express-mongo-sanitize` strips prohibited characters (like `$` and `.`) from request bodies to prevent NoSQL injection.

---

### Threat 8: Malicious Executables & MIME Type Confusion

- **STRIDE Category:** Elevation of Privilege / Tampering
- **Attacker Scenario:** An attacker uploads a malicious executable binary (`.exe`, `.sh`, `.bat`) or an HTML file containing embedded XSS scripts, masquerading it as a harmless `.pdf` or `.png`.
- **Blast Radius:** Cross-site scripting, drive-by downloads, or remote code execution.
- **My Architectural Mitigations:**
  1. **Strict Whitelisting in Multer**: Both MIME types and file extensions are checked against an explicit whitelist of safe document types (`.pdf`, `.docx`, `.xlsx`, `.txt`, `.csv`, `.jpg`, `.png`, `.webp`).
  2. **Download Response Hardening**:
     - `X-Content-Type-Options: nosniff` forces browsers to honor the declared MIME type and prevents MIME confusion attacks.
     - `Content-Disposition: attachment; filename="..."` enforces download rather than inline execution in the application's origin context.
     - Content Security Policy (CSP) headers applied via Helmet prevent unauthorized inline script execution.

---

## 3. STRIDE Security Matrix

| STRIDE Threat Category | Primary Attack Vector | Implemented Defense Layer | Fallback / Forensic Detection |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Stale JWT replay after departure | Atomic `tokenVersion` check on every API call | Instant 401 response & session purge |
| **Tampering** | Modifying stored documents on disk | SHA-256 pre-streaming hash verification | HTTP 500 abort & tamper alert log |
| **Repudiation** | Erasing audit logs after breach | Mongoose document & query immutability pre-hooks | `ImmutableAuditLogError` throws on update/delete |
| **Information Disclosure** | IDOR URL enumeration on `/documents/:id` | `authorizeDocumentAccess` authorization checks | Automated `VIEW_ATTEMPT_DENIED` audit log |
| **Denial of Service** | Credential stuffing & brute force | Tiered `express-rate-limit` (10 per 15m on login) | IP-based request throttling |
| **Elevation of Privilege**| Registering as `role: 'admin'` | Hardcoded rejection of admin role during sign-up | Multi-tiered operational authorization hierarchy |

---

## 4. Verification & Automated Security Test Suite

To prove the efficacy of these mitigations, I wrote a comprehensive security test suite in `backend/tests/security.test.js` using Jest, Supertest, and an in-memory MongoDB server. All 9 security assertions run and pass automatically on every build:

1. **Unauthenticated access** to protected documents returns `401 Unauthorized`.
2. **Unauthorized viewer access** triggers `403 Forbidden` and creates a `VIEW_ATTEMPT_DENIED` audit log.
3. **Read-only viewers** are blocked from editing or modifying permissions (`403 Forbidden`).
4. **Owners of other documents** cannot access unshared files (`403 Forbidden`).
5. **Legitimate owners and administrators** receive `200 OK` on authorized downloads.
6. **Explicitly shared viewers** receive `200 OK` on shared files.
7. **Stale tokens** (after `tokenVersion` increment) immediately fail with `401 Unauthorized`.
8. **Audit log modification/deletion** attempts throw an error and fail due to immutability hooks.
9. **Tampered disk files** fail cryptographic SHA-256 verification and abort download transmission.

---

## 5. Architectural Trade-offs & Future Hardening

When designing this system, I weighed several practical engineering trade-offs:

1. **Stateless JWTs vs. Database Check (`tokenVersion`)**:
   - *Trade-off*: Pure stateless JWTs avoid a database read on every request. However, they make immediate session revocation impossible without short lifespans or Redis blacklists.
   - *My Decision*: Validating `tokenVersion` against the User record on authenticated requests provides instant, guaranteed revocation with minimal database overhead (indexed user lookup).
2. **Client-Side Encryption vs. Server-Side Checksums**:
   - *Trade-off*: End-to-end zero-knowledge client encryption prevents the server from ever seeing plaintext, but prevents server-side search and collaboration features.
   - *My Decision*: For Vaultoran, I implemented server-side cryptographic hashing with strictly isolated disk storage. In a future iteration, I plan to integrate AWS KMS envelope encryption (AES-256-GCM) where each document has its own unique Data Encryption Key (DEK).
3. **SIEM / Webhook Integration**:
   - *Roadmap*: Integrating real-time Webhook alerts to a SOC channel (Slack/PagerDuty) whenever consecutive `VIEW_ATTEMPT_DENIED` logs are recorded from the same IP address.
