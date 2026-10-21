# Security & Threat Model — Vaultron

**Project:** Vaultron (Zero-Trust Document Vault)  
**Author:** Nova Rakesh  
**Repository:** [https://github.com/novarakesh/vaultoran.git](https://github.com/novarakesh/vaultoran.git)  

---

## 1. System Overview

Vaultron is a secure document exchange platform designed around a **Zero-Trust** model:
- Files are never stored in a public folder or served statically.
- Every single request to view, download, or edit a file requires authentication and document-level clearance.
- Actions are recorded in an append-only, tamper-proof audit trail that cannot be modified or deleted.
- User sessions can be revoked globally and instantly without external caching tools.

---

## 2. Key Assets Protected

| Asset | What It Is | How It Is Protected |
| :--- | :--- | :--- |
| **Confidential Files** | Uploaded documents (PDFs, reports, contracts) | Stored outside the web root with random 32-byte names and restricted access |
| **Integrity Checksums** | SHA-256 hashes of each file | Saved in the database and re-verified on disk before every download |
| **User Passwords** | Login credentials | Hashed with bcrypt (12 salt rounds), never returned in API responses |
| **Session Tokens** | JWT bearer tokens | Signed with a high-entropy secret and tied to a numeric `tokenVersion` |
| **Audit Logs** | Historical log of security events | Append-only collection protected by database-level mutation blocks |

---

## 3. Threats & Mitigations

### 1. Unauthorized URL Access (IDOR — Insecure Direct Object Reference)
* **The Risk:** A user logs in, receives a document at `/api/documents/:id`, and modifies the ID in the URL to access another user's or organization's confidential file.
* **The Mitigation:** Every request runs through the `authorizeDocumentAccess` middleware. The server verifies:
  1. Is the user the owner of the document?
  2. Is the user a system administrator?
  3. Has the owner explicitly granted clearance to this user in the `sharedWith` list?
  
  If none of these are true, access is immediately blocked with **HTTP 403 Forbidden**, and a `VIEW_ATTEMPT_DENIED` event is automatically recorded in the audit log with the user's IP address and timestamp.

---

### 2. Tampering with or Deleting Audit Logs
* **The Risk:** An unauthorized user or rogue account modifies or wipes audit records to hide file downloads, permission changes, or deletions.
* **The Mitigation:** The `AuditLog` collection is strictly append-only:
  - New log entries can be created.
  - Pre-hooks on the Mongoose model intercept all update and delete operations (`updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `findOneAndUpdate`, etc.) and throw a permanent security error.
  - Logs can never be altered or erased through the application.

---

### 3. Compromised Tokens & Session Revocation
* **The Risk:** A user's JWT token is stolen, or a user is removed from an organization, but their token remains valid until its 24-hour expiration time.
* **The Mitigation:** Each user profile includes a numeric `tokenVersion` field in MongoDB:
  - Active JWT tokens contain the user's current `tokenVersion`.
  - When an admin revokes an account or the user logs out from all devices, `tokenVersion` increments by 1.
  - On every subsequent request, the server compares the token's version to the database version. If they do not match, the request is rejected with **HTTP 401 Unauthorized** in 0ms.

---

### 4. Privilege Escalation During Registration
* **The Risk:** An attacker submits a signup request with `{ "role": "admin" }` to gain administrative privileges over the platform.
* **The Mitigation:** The registration controller (`authController.js`) enforces server-side validation:
  - Any registration request specifying `role: 'admin'` is rejected with **HTTP 400 Bad Request**.
  - Public registration only allows the creation of `owner` or `viewer` accounts.
  - Administrator accounts can only be created by system administrators via secure seed scripts.

---

### 5. File Tampering on the Server Disk
* **The Risk:** An attacker or malicious process directly alters or replaces a stored document file on the server's disk without updating database metadata.
* **The Mitigation:**
  - When a file is uploaded, the server calculates its SHA-256 cryptographic hash and stores it in the database.
  - Before streaming a file for download, the server re-calculates the SHA-256 hash of the file currently on disk.
  - If the computed hash does not match the database record, the download stream is immediately aborted with **HTTP 500**, preventing corrupted or tampered files from reaching the user.

---

### 6. Directory and Path Traversal (`../../`)
* **The Risk:** An attacker uploads a file with a malicious name containing `../` to overwrite system files, or requests paths outside the intended storage folder.
* **The Mitigation:**
  - Files are renamed on upload to random 32-byte hexadecimal strings. The original user filename is stored strictly as a display label in the database.
  - File download paths are sanitized using `path.resolve` to ensure the target path stays strictly inside the designated `./storage` folder.

---

### 7. Brute-Force and Credential Stuffing
* **The Risk:** Automated bots submit thousands of password guesses to compromise user accounts.
* **The Mitigation:**
  - The login route (`/api/auth/login`) is protected by `express-rate-limit`, restricting requests to a maximum of **10 attempts per 15 minutes** per IP address.
  - Passwords are salted and hashed using `bcrypt` with 12 rounds, making offline cracking computationally expensive.

---

## 4. Automated Security Verification

The security model is backed by 13 automated tests in `backend/tests/security.test.js` using Jest and Supertest (`npm test`):

1. **Unauthenticated Access:** Unauthenticated requests return `401 Unauthorized`.
2. **Access Denial Auditing:** Accessing unshared files returns `403 Forbidden` and creates a `VIEW_ATTEMPT_DENIED` audit log.
3. **Read-Only Restrictions:** Viewers with `read` clearance cannot edit or share documents (`403 Forbidden`).
4. **Cross-Tenant Document Isolation:** Document owners cannot access documents owned by other owners (`403 Forbidden`).
5. **Secure Headers:** Authorized file downloads include `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`.
6. **Authorized Streaming:** Shared viewers with valid clearance receive `200 OK` and the exact file contents.
7. **Session Killswitch:** Stale tokens return `401 Unauthorized` immediately after `tokenVersion` increments.
8. **Audit Trail Immutability:** Update and delete queries on `AuditLog` are rejected by database pre-hooks.
9. **Tamper Detection:** Modifying file contents on disk triggers a SHA-256 mismatch and aborts the stream with HTTP 500.
10. **Viewer Deletion Cleanup:** Deleting a viewer removes the user and pulls their clearance from all shared documents.
11. **Owner Deletion Cascade:** Deleting an owner soft-deletes all documents owned by that user.
12. **Admin Protection Rules:** Administrators cannot delete another administrator or their own account.
13. **Non-Admin Restriction:** Non-administrators receive `403 Forbidden` when attempting user governance operations.

---

## 5. Current Limitations & Future Improvements

1. **At-Rest Encryption:** Files are verified against cryptographic SHA-256 hashes, but stored file bytes are not encrypted with AES-256-GCM at rest on the local disk. Future releases will add envelope encryption with managed keys.
2. **Cloud Storage Persistence:** Files are currently stored on the local server filesystem. On free cloud hosting tiers like Render, local files are reset when the container restarts. Future versions will integrate with AWS S3 or Cloudflare R2 with private bucket policies.
3. **Multi-Factor Authentication (MFA):** Authentication currently relies on email and password. Future versions will add Time-based One-Time Password (TOTP) support.
