# TrustVault — High-Security Confidential Document Sharing Platform

TrustVault is a confidential document sharing platform built with defense-in-depth principles.

## Repository Architecture

This repository is structured for a full-stack deployment:
- **`backend/`**: Node.js, Express, Mongoose, JWT, multer, Jest + Supertest (Completed & Tested)
- **`frontend/`**: React application with Tailwind CSS (Scheduled for phase 2 after backend deployment)

## Documentation Quick Links
- [Backend Documentation & Render Deployment Guide](file:///backend/README.md)
- [Threat Model & Security Mitigations (THREATS.md)](file:///THREATS.md)
- [AI Engineering & Prompts Audit Log (PROMPTS.md)](file:///PROMPTS.md)

## Automated Security Verification
The test suite in `backend/tests/security.test.js` enforces all 9 core security proofs:
1. Unauthenticated request returns 401.
2. A viewer with no share gets 403 on download, and a `VIEW_ATTEMPT_DENIED` log is created.
3. A read-only viewer cannot edit or share (403).
4. Owner of another document gets 403.
5. Admin and owner get 200.
6. A shared viewer gets 200.
7. A stale token (after tokenVersion increment) returns 401.
8. AuditLog update/delete attempts throw.
9. Tampered file fails the hash integrity check.

Run tests:
```bash
cd backend
npm test
```
