# Vaultron

Zero-trust confidential document exchange with role-based access control, cryptographic integrity verification, and immutable audit logging.

---

## Tech Stack
- **Backend:** Node.js, Express, MongoDB, JWT, Multer, Jest
- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons

---

## Quick Start

### 1. Backend
```bash
cd backend
npm install
npm run seed     # Seeds demo accounts
npm run dev      # Runs on http://localhost:5000
npm test         # Runs 9 automated security proofs
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev      # Runs on http://localhost:5173
```

---

## Demo Accounts (1-Click Login)

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@trustvault.io` | `AdminVault#2026!` | Audit ledger, user roles, session revocation |
| **Owner** | `owner@trustvault.io` | `OwnerVault#2026!` | Upload documents, delegate clearances |
| **Viewer** | `viewer1@trustvault.io` | `Viewer1Vault#2026!` | View & stream authorized files only |

---

## Core Security Features (All 9 Tests Passing)
1. **Authentication Enforcement:** Unauthenticated requests return `401 Unauthorized`.
2. **Access Denial Auditing:** Unshared file downloads return `403` and record `VIEW_ATTEMPT_DENIED`.
3. **Read-Only Restrictions:** Read-only viewers cannot edit or share (`403 Forbidden`).
4. **Strict Isolation:** Other document owners cannot access unshared files (`403 Forbidden`).
5. **Hardened Headers:** Authorized downloads stream with `nosniff` and `attachment` headers.
6. **Clearance Streaming:** Explicitly cleared viewers receive `200 OK` streams.
7. **Instant Killswitch:** Stale tokens after `tokenVersion` revocation return `401`.
8. **Immutable Audit Trail:** Mongoose pre-hooks block any update or delete queries on `AuditLog`.
9. **Tamper Detection:** SHA-256 mismatch on disk immediately aborts file streaming.

---

## What the AI Got Wrong & Fixed
- **Audit Immutability:** AI only hooked `doc.save()`, allowing `deleteMany()` to bypass it. Fixed by adding query middleware (`{ query: true }`) across all mutation operations.
- **Admin Privilege Escalation:** AI accepted `role` directly from `req.body`. Fixed with server validation rejecting self-assigned `admin` roles.
- **Cold-Start Freeze:** AI nested `app.listen()` inside `mongoose.connect()`, causing Render port timeouts. Fixed by decoupling port binding and adding a silent pre-warm probe in `<head>`.

---

## What Is Not Finished
1. **Client-Side E2EE:** Verification is server-side SHA-256; browser WebCrypto encryption is not yet added.
2. **Persistent Cloud Storage:** Files store to `./storage`; Render free-tier resets files on container restarts without S3/disk mounts.
3. **MFA:** Single-factor JWT + passwords; lacks TOTP/authenticator 2FA.

---

## Documentation
- [Threat Model (THREATS.md)](file:///THREATS.md)
- [Prompt Log (PROMPTS.md)](file:///PROMPTS.md)
- [Backend Reference (backend/README.md)](file:///backend/README.md)
