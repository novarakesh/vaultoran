# AI Prompts, Engineering Log & Security Reflections — Vaultron

**Project:** Vaultron (Zero-Trust Confidential Document Exchange)  
**Author:** Nova Rakesh  
**Repository:** [https://github.com/novarakesh/vaultoran.git](https://github.com/novarakesh/vaultoran.git)  
**Tech Stack:** Node.js, Express, MongoDB, Mongoose, React 19, Tailwind CSS, Jest, Supertest  

---

## 1. Overview & AI Collaboration Methodology

Throughout the development of Vaultron, I utilized AI as an advanced pair programmer and velocity accelerator. My methodology was structured around a core principle: **AI writes the boilerplate; the human engineer designs the threat model, validates trust boundaries, and audits all security invariants.**

While AI excels at scaffolding CRUD endpoints, writing repetitive UI components, and generating test fixtures, it regularly produces naive implementations that look functionally complete but contain critical security vulnerabilities (such as trusting client input, missing database query hooks, and ignoring multi-tenant cascade failures).

This document catalogs:
1. The chronological prompt sequence used to construct the platform.
2. The architectural decisions guided by human engineering.
3. An honest analysis of **where the AI was wrong**, the security vulnerabilities it introduced, and the exact code fixes implemented.
4. Unfinished work and candid lessons learned.

---

## 2. Chronological Prompt Log by Development Phase

### Phase 1: Architecture, Data Modeling & Core Auth

#### Prompt 1.1: Project Architecture Scaffolding
> *"Help me scaffold a production-ready Node.js Express backend with an MVC directory structure: `config`, `controllers`, `middleware`, `models`, `routes`, and `utils`. We need helmet, cors, morgan, express-rate-limit, and dotenv configured. Ensure clean separation between `app.js` (Express configuration) and `server.js` (HTTP listener)."*

- **Generated Output:** Base directory layout with `app.js` and `server.js`.
- **Engineering Review:** Accepted with minor adjustments to CORS configuration to allow both local Vite development (`http://localhost:5173`) and production Netlify origins.

#### Prompt 1.2: Mongoose Schemas for Zero-Trust Model
> *"Write Mongoose schemas for User, Document, and AuditLog. The User needs role-based access ('admin', 'owner', 'viewer') and a numeric tokenVersion for session invalidation. The Document needs title, category, owner reference, filePath, fileHash (SHA-256), and a sharedWith array containing user ID and permission level ('read' or 'edit'). The AuditLog must record user, action enum, document reference, IP address, user-agent, and metadata."*

- **Generated Output:** Initial `User.js`, `Document.js`, and `AuditLog.js` schemas.
- **Engineering Review:** Added compound indexes (`{ owner: 1, isDeleted: 1 }`, `{ 'sharedWith.user': 1, isDeleted: 1 }`) on `Document` to prevent full collection scans on compartment queries.

---

### Phase 2: Authorization, Cryptography & Session Killswitch

#### Prompt 2.1: Per-Request Document Access Control
> *"Create an Express middleware `authorizeDocumentAccess.js` that checks whether an incoming user can view or download a specific document. The user is allowed if they are the document owner, an administrator, or if their user ID is in the document's sharedWith array. If unauthorized, reject with 403 Forbidden and record an audit log event."*

- **Generated Output:** Basic access control middleware fetching the document by ID.
- **Engineering Review:** Discovered that unauthorized attempts were not writing the audit log atomically. Refactored the middleware to log `VIEW_ATTEMPT_DENIED` with client IP, timestamp, and target document ID before terminating the request.

#### Prompt 2.2: Cryptographic Integrity Verification
> *"Write a utility using Node.js crypto to calculate SHA-256 hashes of uploaded files via streams. Before any file download is streamed to the user in documentController.js, recalculate the hash from disk and compare it with the fileHash stored in MongoDB. If there is a mismatch, abort the stream immediately and return an error."*

- **Generated Output:** `hash.js` utility and controller validation check.
- **Engineering Review:** Verified that file streams are read chunk-by-chunk using `fs.createReadStream()` rather than loading entire files into memory with `fs.readFileSync()`, preventing V8 heap exhaustion.

#### Prompt 2.3: Session Revocation Killswitch
> *"How can we implement instant token revocation without running a separate Redis server? Use a tokenVersion counter on the User model that is embedded into the JWT payload."*

- **Generated Output:** `verifyToken` middleware checking `decoded.tokenVersion === user.tokenVersion`.
- **Engineering Review:** Implemented `POST /api/auth/logout-all` and `PATCH /api/users/:id/revoke` to increment `tokenVersion`, delivering 0ms session revocation.

---

### Phase 3: Frontend Portals & Zero-Trust UI

#### Prompt 3.1: Modern React 19 Frontend with Role Portals
> *"Create a React 19 application using Vite and Tailwind CSS. Implement role-tailored dashboards: an Owner Portal for uploading files and managing clearance lists, a Viewer Dashboard displaying assigned compartments, and an Admin SOC Console displaying real-time audit logs and user management. Use Lucide icons and support crisp light/dark themes."*

- **Generated Output:** Component hierarchy with `OwnerPortal.jsx`, `ViewerPortal.jsx`, `AdminPortal.jsx`, and `Navbar.jsx`.
- **Engineering Review:** Built 1-click preset login buttons (`Quick Fill Admin`, `Quick Fill Owner`, `Quick Fill Viewer`) to streamline evaluator testing.

#### Prompt 3.2: In-Browser Secure Document Preview
> *"Build an in-browser document reader modal for viewers so they can preview PDF and text documents directly inside the application without leaking file paths or downloading unverified files."*

- **Generated Output:** `DocumentPreviewModal.jsx` using secure Blob URLs (`URL.createObjectURL(blob)`).
- **Engineering Review:** Added automatic URL revocation (`URL.revokeObjectURL()`) on modal unmount to prevent browser memory leaks.

---

### Phase 4: Automated Security Proofs & Test Suite

#### Prompt 4.1: Multi-Tenant Isolation Tests with Jest & Supertest
> *"Write an in-memory Jest and Supertest security test suite using mongodb-memory-server. The suite must rigorously test: 1) unauthenticated requests return 401; 2) unshared viewers receive 403; 3) read-only viewers cannot edit or share; 4) an owner of another document receives 403; 5) valid owners and admins receive 200; 6) shared viewers receive 200; 7) stale tokens return 401; 8) audit logs cannot be updated or deleted; and 9) tampered disk files trigger an integrity failure."*

- **Generated Output:** `backend/tests/security.test.js`.
- **Engineering Review:** Expanded the test suite from 9 to 13 tests, adding tests for user deletion cascades, admin self-deletion prevention, and non-admin governance restrictions. All 13 tests pass reliably in CI.

---

## 3. Where the AI Was Wrong: Security Bugs & Human Fixes

The following six case studies detail critical security oversights and operational bugs introduced by the AI, followed by the human engineering analysis and code fixes.

---

### Case 1: Audit Log Query Bypass Vulnerability (Critical Security Flaw)

#### The AI's Mistake
To implement an append-only audit trail, the AI generated document-level pre-hooks on `AuditLog.js`:
```javascript
// AI GENERATED CODE (VULNERABLE)
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable'));
  }
  next();
});

auditLogSchema.pre('deleteOne', { document: true }, function (next) {
  return next(new Error('Audit logs cannot be deleted'));
});
```

#### Why It Was Wrong
In Mongoose, batch database operations like `AuditLog.deleteOne({ _id })`, `AuditLog.deleteMany({})`, and `AuditLog.updateOne()` are **query-level operations**. They bypass document-level middleware entirely. An attacker or rogue developer could execute `AuditLog.deleteMany({ action: 'VIEW_ATTEMPT_DENIED' })` or use MongoDB aggregation to purge records without triggering any error.

#### The Human Fix
I updated the schema to attach query-level middleware (`{ query: true }`) across all mutation operations:
```javascript
// HUMAN FIX (SECURE & APPEND-ONLY)
const rejectAuditModification = function (next) {
  const err = new Error('Security Violation: Audit logs are strictly immutable and cannot be modified or deleted.');
  err.name = 'ImmutableAuditLogError';
  return next(err);
};

// Protect document saves
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) return next(rejectAuditModification());
  next();
});

// Protect all query-level deletions and modifications
auditLogSchema.pre('deleteOne', { document: true, query: true }, rejectAuditModification);
auditLogSchema.pre('deleteMany', { query: true }, rejectAuditModification);
auditLogSchema.pre('updateOne', rejectAuditModification);
auditLogSchema.pre('updateMany', rejectAuditModification);
auditLogSchema.pre('findOneAndUpdate', rejectAuditModification);
auditLogSchema.pre('findOneAndDelete', rejectAuditModification);
auditLogSchema.pre('replaceOne', rejectAuditModification);
auditLogSchema.pre('findOneAndReplace', rejectAuditModification);
```
*Automated Verification:* Test 8 in `security.test.js` now verifies that `updateOne()`, `deleteMany()`, and `save()` all throw `ImmutableAuditLogError`.

---

### Case 2: Role Escalation via Public Registration (High Security Risk)

#### The AI's Mistake
In `authController.js`, the AI generated the user registration handler:
```javascript
// AI GENERATED CODE (VULNERABLE)
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({
    name,
    email,
    passwordHash: await User.hashPassword(password),
    role: role || 'viewer',
  });
  res.status(201).json({ user });
};
```

#### Why It Was Wrong
The AI blindly trusted the `role` field from `req.body`. Anyone could send a simple curl request:
```bash
curl -X POST https://vaultoran-1.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker","email":"hacker@evil.com","password":"Password123!","role":"admin"}'
```
This granted the caller complete administrator access to the audit ledger and user accounts.

#### The Human Fix
I implemented server-side guardrails in `authController.js` rejecting self-assigned admin roles with `400 Bad Request`:
```javascript
// HUMAN FIX (SECURE RBAC VALIDATION)
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Strict server-side validation: Admin role can never be self-assigned
  if (role && role.toLowerCase() === 'admin') {
    return res.status(400).json({
      error: 'Security Violation: Administrator accounts cannot be created via public registration.'
    });
  }

  const assignedRole = (role && ['owner', 'viewer'].includes(role.toLowerCase())) 
    ? role.toLowerCase() 
    : 'viewer';

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: await User.hashPassword(password),
    role: assignedRole,
    tokenVersion: 0,
  });

  res.status(201).json({ user });
};
```

---

### Case 3: Cloud Cold-Start Deadlock on Render (Operational / Availability Failure)

#### The AI's Mistake
The AI coupled HTTP server port-binding to the database connection:
```javascript
// AI GENERATED CODE (FRAGILE)
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

#### Why It Was Wrong
On Render's free tier, containers spin down after 15 minutes of inactivity. When a request arrived:
1. Render started the container and set a 60-second timer for the port to open.
2. MongoDB Atlas DNS resolution and SSL handshake took 25–45 seconds.
3. If any network jitter occurred, Render killed the process with `Port failed to bind within 60s`, putting the service into a crash loop.
4. Furthermore, users visiting the frontend stared at a blank screen for 50 seconds before login was possible.

#### The Human Fix
1. **Decoupled Port Binding:** In `server.js`, I bound `app.listen()` immediately to `0.0.0.0` so Render's health check succeeded in $< 2$ seconds, while MongoDB connected asynchronously in the background.
2. **Frontend Pre-Warm Probe:** In `frontend/index.html`, I embedded an asynchronous, non-blocking fetch probe in `<head>`:
   ```html
   <script>
     (function() {
       try {
         var isLocal = window.location.hostname === 'localhost';
         var apiUrl = isLocal ? 'http://localhost:5000' : 'https://vaultoran-1.onrender.com';
         fetch(apiUrl + '/api/health', { method: 'GET', mode: 'cors', cache: 'no-store' });
       } catch(e) {}
     })();
   </script>
   ```
   This wakes the sleeping backend container the moment the user opens the frontend page, eliminating login latency.

---

### Case 4: Broken Viewer Picker Route in Owner Portal (Functionality Bug)

#### The AI's Mistake
The frontend code generated for `OwnerPortal.jsx` called `apiClient.get('/api/users/viewers')` to populate the delegation dropdown. However, the backend router in `routes/users.js` only defined `GET /api/users`.

#### Why It Was Wrong
The request returned `404 Not Found`. The viewer dropdown remained empty, preventing owners from granting document clearances.

#### The Human Fix
1. Added a dedicated `/api/users/viewers` endpoint in `userController.js` returning all active viewers.
2. Added client-side defensive fallback in `OwnerPortal.jsx` to query `/api/users` and filter `u.role === 'viewer'` if the dedicated route ever failed.

---

### Case 5: Orphaned ACL References on User Deletion (Data Integrity Bug)

#### The AI's Mistake
When prompted to implement user deletion for the Admin Console, the AI generated:
```javascript
// AI GENERATED CODE (INCOMPLETE)
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};
```

#### Why It Was Wrong
1. If a deleted viewer had access to 10 documents, their `_id` remained in `Document.sharedWith`. Subsequent queries attempting to `.populate('sharedWith.user')` threw null pointer exceptions.
2. If an owner was deleted, their uploaded files remained orphaned in the database.
3. No audit log was created, violating compliance standards.

#### The Human Fix
Rewrote `deleteUser` in `userController.js` as an atomic administrative pipeline:
```javascript
// HUMAN FIX (CASCADING GOVERNANCE)
exports.deleteUser = async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  // Guardrails: cannot delete other admins or self
  if (targetUser.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete an administrator account.' });
  }
  if (targetUser._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ error: 'Administrators cannot delete their own account.' });
  }

  // 1. If owner, soft-delete all their documents
  if (targetUser.role === 'owner') {
    await Document.updateMany({ owner: targetUser._id }, { isDeleted: true });
  }

  // 2. Remove user from all sharedWith arrays
  await Document.updateMany(
    { 'sharedWith.user': targetUser._id },
    { $pull: { sharedWith: { user: targetUser._id } } }
  );

  // 3. Remove user
  await User.findByIdAndDelete(targetUser._id);

  // 4. Log immutable governance event
  await createAuditLog({
    user: req.user._id,
    action: 'DELETE',
    ip: getClientIp(req),
    userAgent: req.get('user-agent'),
    metadata: {
      governanceAction: 'USER_DELETION',
      targetEmail: targetUser.email,
      targetRole: targetUser.role,
    },
  });

  res.json({ message: 'User and associated shares deleted successfully.' });
};
```

---

### Case 6: Public User Signup on Login Page (Open Self-Registration Flaw)

#### The AI's Mistake
The AI originally generated a public user signup tab and registration form directly on the login screen, allowing arbitrary external visitors to self-register accounts on the platform.

#### Why It Was Wrong
In a Zero-Trust confidential document exchange, unvetted public account creation is an architectural violation. Allowing open self-registration invites malicious actors to create unapproved accounts, probe the document namespace, and bypass corporate credential vetting.

#### The Human Fix
I removed the public user signup page from the login interface entirely, making the login screen a pure corporate authentication gateway. I replaced open registration with a closed identity governance model where **only authenticated administrators can create and provision new user accounts** via `POST /api/users` in the Admin Governance Console, requiring explicit role assignment (`admin`, `owner`, `viewer`) and enforcing password complexity policies and append-only audit trail logging.

---

## 4. Candid Assessment: What Is Unfinished

1. **Storage Persistence:** On Render's free tier, local disk storage resets when containers restart. While an encrypted MongoDB backup buffer was added to `Document.fileData`, an enterprise deployment requires integration with AWS S3 using bucket-level encryption (SSE-KMS) and IAM role gating.
2. **At-Rest Filesystem Encryption:** Files on disk are verified against SHA-256 digests, but raw bytes are not encrypted with AES-256-GCM on disk.
3. **Multi-Factor Authentication (MFA):** Passwords are encrypted with bcrypt, but hardware-based MFA (WebAuthn/FIDO2) or TOTP authenticator app support has not yet been implemented.
4. **Automated Password Reset:** No transactional email provider (SendGrid/Postmark) is wired up; lost passwords must be reset directly by an administrator.

---

## 5. Summary & Engineering Takeaway

Working with AI accelerated initial prototyping by approximately $4\times$, especially for responsive CSS layouts, icon wiring, and test harness boilerplate. However, **security cannot be delegated to an AI assistant**. The AI repeatedly defaulted to permissive, happy-path logic that completely compromised the zero-trust model (accepting admin roles on signup, skipping query-level audit locks, and creating orphaned multi-tenant ACLs).

A secure system requires active adversarial thinking, rigorous manual code auditing, and deterministic automated testing.
