# Vaultoran — Engineering Notes & AI Pairing Journal

**Author:** Nova Rakesh  
**Project:** Vaultoran (Zero-Trust Confidential Document Exchange)  
**Stack:** React 19, Vite, Tailwind CSS, Node.js, Express, MongoDB/Mongoose, JWT, Multer, Jest & Supertest  

---

## Overview

When building **Vaultoran**, I wanted to create a production-grade, zero-trust document vault that solves a real enterprise problem: how to share confidential files (legal contracts, financial audits, security reports) with strict role segregation, instant session revocation, cryptographic file integrity, and an immutable audit trail.

I utilized AI as an interactive pair-programming partner during development. Rather than having AI generate black-box code, I drove the technical specifications, architectural constraints, security models, and test requirements. Throughout the process, I caught multiple security gaps, edge cases, and runtime discrepancies in AI suggestions, which I manually diagnosed and corrected.

This document logs my architectural thought process, the prompt instructions I crafted, the bugs and nuances I resolved, and the iterations made along the way.

---

## 1. Core Architecture & Requirements Planning

### My Architectural Goals
1. **Zero-Trust File Storage**: Files must never be served statically via `express.static` or direct URLs. Every single read must pass through authentication, role checks, and document-level permission verification.
2. **Instant Global Session Revocation**: In standard JWT architectures, revoking a compromised token requires either short expirations or heavy Redis blacklists. I decided to implement a numeric `tokenVersion` on the User model. If a user logs out or an admin revokes access, incrementing `tokenVersion` instantly invalidates all existing JWTs across all devices without maintaining an in-memory store.
3. **Immutable Audit Ledger**: In compliance standards (SOC 2, ISO 27001), logs must be append-only. No user—including the system administrator—should ever be allowed to modify or delete audit log entries.
4. **Cryptographic Integrity**: Protect against silent disk corruption or unauthorized file substitution by computing SHA-256 hashes on upload and validating them prior to streaming on download.

---

## 2. Iteration Log: Phase by Phase

### Phase 1: Authentication & Zero-Trust Session Management

#### What I Prompted & Specified
I prompted the AI to structure the backend directory with clear separation of concerns (`src/config`, `src/models`, `src/middleware`, `src/routes`, `src/controllers`, `src/utils`). I specified strict user roles (`admin`, `owner`, `viewer`) and instructed it to implement JWT authentication with `tokenVersion` verification on every request.

#### Issues I Caught & Corrections I Made
1. **Self-Escalation Vulnerability in Registration**:
   - *What happened*: The AI's initial registration controller accepted whatever `role` was passed in the request body. If a user sent `{ role: 'admin' }`, the server would have happily created an admin account!
   - *My fix*: I added explicit server-side role validation in `authController.js`. If a request specifies `role: 'admin'`, it immediately rejects the request with HTTP 400. Self-service accounts are restricted to `viewer` or `owner` (defaulting to `viewer`).
2. **Rate Limiting on Authentication**:
   - *What happened*: Auth endpoints were initially exposed to unlimited login attempts.
   - *My fix*: Configured `express-rate-limit` to strictly limit login requests to 10 attempts per 15 minutes per IP address, preventing brute-force and credential stuffing attacks.

---

### Phase 2: Confidential Document Vault & Cryptographic Verification

#### What I Prompted & Specified
I designed the document upload and retrieval workflow using `multer` with private local disk storage. I specified:
- Randomized disk filenames (so physical paths cannot be guessed).
- SHA-256 checksum calculation during upload.
- Permission-based download stream with cryptographic verification before sending bytes.

#### Issues I Caught & Corrections I Made
1. **Supertest Binary Stream Assertion Failure**:
   - *What happened*: When testing the download endpoint in Jest/Supertest, the test assertion failed because Supertest parsed `application/pdf` streams into binary Buffers in `res.body` instead of string content in `res.text`.
   - *My fix*: I updated the test assertions to normalize both binary buffers and string outputs (`res.text || (Buffer.isBuffer(res.body) ? res.body.toString() : '')`), allowing tests to pass reliably across all file MIME types.
2. **Path Traversal Protection**:
   - *What happened*: Relying solely on stored document paths could leave the filesystem open to directory traversal if a record were ever tampered with.
   - *My fix*: Enforced strict path canonicalization:
     ```javascript
     const resolvedPath = path.resolve(doc.filePath);
     const safeStorageDir = path.resolve(config.storageDir);
     if (!resolvedPath.startsWith(safeStorageDir)) {
       return res.status(403).json({ error: 'Access Denied: Path traversal detected.' });
     }
     ```
3. **Tamper Detection Before Streaming**:
   - *What happened*: The initial code started streaming bytes while computing the hash concurrently, meaning an attacker could receive the beginning of a tampered file before the stream errored out.
   - *My fix*: I structured the controller to compute the SHA-256 hash of the on-disk file *first*, verify it matches `doc.fileHash`, and only then pipe the stream to the response with `nosniff` and `Content-Disposition: attachment` headers.

---

### Phase 3: Immutable Audit Trail & Mongoose Hook Traps

#### What I Prompted & Specified
I needed an audit trail that records every critical security action (`UPLOAD`, `DOWNLOAD`, `VIEW_ATTEMPT_DENIED`, `PERMISSION_CHANGE`, `DELETE`, `LOGIN`). Crucially, these records must be append-only.

#### Issues I Caught & Corrections I Made
1. **Query-Level Mutation Bypass in Mongoose**:
   - *What happened*: The initial AI implementation placed pre-hooks only on `document.prototype.save` and `document.prototype.deleteOne`. However, in Mongoose, queries like `AuditLog.updateOne()`, `AuditLog.findOneAndUpdate()`, or `AuditLog.deleteMany()` bypass document middleware entirely!
   - *My fix*: I bound the immutability pre-hook across both document and query middleware contexts (`{ document: true, query: true }`), ensuring any attempted update or delete throws an `ImmutableAuditLogError`:
     ```javascript
     const rejectAuditModification = function (next) {
       const err = new Error('Security Violation: Audit logs are strictly immutable and cannot be modified or deleted.');
       err.name = 'ImmutableAuditLogError';
       return next(err);
     };

     auditLogSchema.pre('updateOne', { query: true }, rejectAuditModification);
     auditLogSchema.pre('updateMany', { query: true }, rejectAuditModification);
     auditLogSchema.pre('findOneAndUpdate', { query: true }, rejectAuditModification);
     auditLogSchema.pre('findOneAndDelete', { query: true }, rejectAuditModification);
     auditLogSchema.pre('deleteOne', { document: true, query: true }, rejectAuditModification);
     auditLogSchema.pre('deleteMany', { query: true }, rejectAuditModification);
     auditLogSchema.pre('replaceOne', { query: true }, rejectAuditModification);
     ```
2. **Reverse Proxy IP Resolution**:
   - *What happened*: On cloud platforms (Render/Cloudflare), `req.ip` initially resolved to the internal proxy IP rather than the client's public IP.
   - *My fix*: Added `app.set('trust proxy', 1)` in Express and created a dedicated `getClientIp` helper parsing the first entry of `x-forwarded-for`.

---

### Phase 4: Frontend Development & Role Compartments

#### What I Prompted & Specified
For the frontend, I wanted a modern, high-contrast security interface built with React, Vite, and Tailwind CSS. Key UI features:
- Three dedicated role dashboards: **Admin Console** (Audit logs, role management, threat intelligence), **Owner Portal** (Private vault, upload modal, permission delegation), and **Viewer Portal** (Cleared documents, access tags).
- Seamless instant 1-click role logins for review/interview demos (`admin@trustvault.io`, `owner@trustvault.io`, `viewer1@trustvault.io`).
- Persistent dark / light mode toggle.

#### Issues I Caught & Corrections I Made
1. **Redundant Navigation Controls**:
   - *Observation*: The top navigation bar contained a hamburger toggle directly adjacent to the dark/light mode button, creating visual clutter and duplicate controls since the collapsible sidebar already had its own dedicated collapse/expand toggles.
   - *My fix*: Removed the redundant navbar hamburger button, streamlining the top bar into a clean theme toggle, user status pill, and logout action.
2. **Session Revocation UX**:
   - *What happened*: When an admin revoked a user's session or the user triggered "Revoke All Sessions", subsequent requests failed with 401, but the UI had no clean explanation.
   - *My fix*: Added an Axios response interceptor that dispatches a custom `trustvault_session_revoked` window event, which `AuthContext` catches to clear local state and display a clear, dismissible red security banner on the login screen.

---

### Phase 5: Solving Cloud Free-Tier Cold-Start Latency (Render)

#### The Problem
When testing the live deployment on Render's free tier, inactive services automatically spin down after 15 minutes. When a first-time visitor or interviewer opened the login page and clicked "Sign In", the request hung for 30–50 seconds while Render spun up the container and connected to MongoDB Atlas. This gave the false impression that the application was unresponsive or broken.

#### How I Resolved It
1. **Immediate Frontend Pre-Warming**:
   - Added `<link rel="preconnect">` and `<link rel="dns-prefetch">` to `index.html`.
   - Embedded an immediate non-blocking health check ping (`fetch('/api/health')`) inside `<head>`. The cold-start boot sequence begins the instant the user's browser requests the webpage—long before they even enter their credentials!
2. **Instant HTTP Port Binding on the Backend**:
   - Previously, `server.js` waited for `connectDB()` to resolve before calling `app.listen()`. Render's reverse proxy considers the container down until the port opens, adding 5–10 seconds of delay.
   - I refactored `server.js` so `app.listen()` binds to port `0.0.0.0` immediately, while `connectDB()` connects concurrently in the background. Mongoose automatically buffers queries, so incoming requests resolve seamlessly without waiting for proxy timeouts.
   - Disabled Mongoose `autoIndex` in production to eliminate index builds on every cold start.
3. **Live Cloud Enclave Status & Reassuring UI Feedback**:
   - Integrated a live health probe on `LoginPage.jsx` that displays an enclave status badge:
     - `🟢 Cloud Enclave Online • Instant Login Ready` when warm.
     - `⚡ Free-tier cloud backend waking up... (~10-15s first visit)` when booting.
   - Added an active loading timer: if a login request takes longer than 2 seconds during a cold boot, the UI proactively displays an animated notice explaining that the free-tier container is waking up. Interviewers are never left guessing.

---

## 3. Engineering Reflections & Takeaways

Working with AI as an engineering collaborator was a valuable exercise in technical discernment. While AI can rapidly draft boilerplate and schema structures, **it lacks intrinsic awareness of edge-case security risks, query-level hook bypasses, and real-world deployment latency.**

By treating AI as an assistant rather than an authority, I:
- Enforced zero-trust principles at every layer of the stack.
- Built a verifiable defense-in-depth model with 9 automated security integration tests.
- Solved practical production bottlenecks (cloud spin-up times, proxy IP extraction, and immutable audit guarantees).

*Vaultoran demonstrates that with rigorous architecture and attentive oversight, high-security web applications can be designed cleanly, tested thoroughly, and deployed reliably.*
