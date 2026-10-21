# Vaultron — High-Security Confidential Document Sharing Platform

Vaultron is an enterprise-grade backend architecture designed for zero-trust confidential document sharing. It enforces strict role-based access control, cryptographic integrity verification, instant token revocation, and immutable audit trails.

---

## Key Security Features

- **Strict Role-Based Access Control**: Three distinct roles: `admin`, `owner`, and `viewer`. Registration blocks self-assignment of the `admin` role.
- **Per-Request Authorization (`authorizeDocumentAccess`)**: Every document query, metadata lookup, share change, or download validates whether the user is the owner, an administrator, or an authorized viewer.
- **Automated Intrusion Logging**: Denied document access attempts immediately write an immutable `VIEW_ATTEMPT_DENIED` audit record before returning `HTTP 403 Forbidden`.
- **Append-Only Immutable Audit Trail**: Mongoose pre-hooks on document and query modifications (`updateOne`, `deleteMany`, `findOneAndUpdate`, etc.) throw uncatchable security errors to prevent audit log tampering.
- **Session Revocation Killswitch (`tokenVersion`)**: Any user or administrator can instantly invalidate all active JWTs by incrementing `tokenVersion`.
- **Cryptographic Integrity Checks**: Every uploaded document computes a SHA-256 integrity checksum. Files are re-verified on disk prior to streaming. If the hash does not match, streaming aborts and an alert is raised.
- **Isolated Storage**: Files are saved in a protected vault directory outside the web root with 64-character crypto-random hex filenames.

---

## Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # Mongoose connection & lifecycle
│   │   └── env.js             # Environment variable loader & assertions
│   ├── models/
│   │   ├── User.js            # User model with role & tokenVersion
│   │   ├── Document.js        # Document model with SHA-256 & sharedWith
│   │   └── AuditLog.js        # Immutable, append-only security logs
│   ├── middleware/
│   │   ├── verifyToken.js     # JWT Bearer token & tokenVersion validator
│   │   ├── authorizeRole.js   # Role-based privilege gating
│   │   ├── authorizeDocumentAccess.js # Document-level authorization & denial audit
│   │   ├── upload.js          # Multer storage with crypto names & MIME whitelist
│   │   ├── rateLimit.js       # IP rate limiters for auth and API
│   │   └── errorHandler.js    # Global security error handler
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── documentController.js
│   │   ├── userController.js
│   │   └── auditController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── documents.js
│   │   ├── users.js
│   │   └── audit.js
│   ├── utils/
│   │   ├── hash.js            # SHA-256 buffer & stream hashing utilities
│   │   └── audit.js           # Client IP detection and audit log writer
│   ├── app.js                 # Express application setup
│   └── server.js              # Server bootstrapper listening on 0.0.0.0
├── scripts/
│   └── seed.js                # Database seeder (admin, owner, 2 viewers)
├── storage/                   # Private document vault (excluded from git)
├── tests/
│   └── security.test.js       # 9 Supertest & Jest security test suites
├── .env.example
├── .gitignore
├── package.json
├── THREATS.md                 # Threat model & mitigations documentation
├── PROMPTS.md                 # AI prompt log & feedback template
└── README.md
```

---

## Getting Started Locally

### 1. Prerequisites
- Node.js v18+ or v20+ / v22+
- MongoDB Atlas connection string (or local MongoDB daemon)

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the following variables are configured in `.env`:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.fwiux9k.mongodb.net/trustvault?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=24h
STORAGE_DIR=./storage
MAX_FILE_SIZE_MB=15
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### 4. Seed Initial Accounts
Populates the database with 1 Administrator, 1 Owner, and 2 Viewers:
```bash
npm run seed
```

Default credentials:
- **Admin**: `admin@trustvault.io` / `AdminVault#2026!`
- **Owner**: `owner@trustvault.io` / `OwnerVault#2026!`
- **Viewer 1**: `viewer1@trustvault.io` / `Viewer1Vault#2026!`
- **Viewer 2**: `viewer2@trustvault.io` / `Viewer2Vault#2026!`

### 5. Run the Automated Security Tests
Executes the in-memory Jest + Supertest security suite testing all 9 security constraints:
```bash
npm test
```

### 6. Start the Server
```bash
# Production start
npm start

# Development mode with hot-reloading
npm run dev
```

---

## API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new `owner` or `viewer` account |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Login, returns JWT, logs `LOGIN` audit |
| `POST` | `/api/auth/logout-all` | Private | Increments `tokenVersion` (revokes all active sessions) |
| `GET` | `/api/auth/me` | Private | Retrieves current authenticated profile |

### Documents (`/api/documents`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents` | Owner, Admin | Multipart file upload; computes SHA-256; logs `UPLOAD` |
| `GET` | `/api/documents` | Authenticated | Scoped listing of accessible documents with query filters |
| `GET` | `/api/documents/:id` | Authorized | Metadata lookup (pre-authorized) |
| `GET` | `/api/documents/:id/download` | Authorized | Validates SHA-256 integrity, streams file, logs `DOWNLOAD` |
| `PUT` | `/api/documents/:id/share` | Owner, Admin | Update document shares; logs `PERMISSION_CHANGE` |
| `DELETE`| `/api/documents/:id` | Owner, Admin | Soft-deletes document; logs `DELETE` |

### Users & Administration (`/api/users` & `/api/audit`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Owner, Admin | Minimal user directory for share assignment |
| `PATCH`| `/api/users/:id/revoke` | Admin | Emergency session killswitch for target user |
| `GET` | `/api/audit` | Admin | Paginated, filterable security audit trail |
| `GET` | `/api/health` | Public | Service health & uptime probe |

---

## Render Deployment Guide

Follow these steps to deploy TrustVault to Render:

### Step 1: Create a New Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `https://github.com/novarakesh/vaultoran.git`.

### Step 2: Configure Service Settings
- **Name**: `trustvault-backend`
- **Region**: Choose the region closest to your MongoDB Atlas cluster (e.g., Frankfurt, Oregon, Singapore).
- **Branch**: `main`
- **Root Directory**: `backend` *(Critical: Tell Render where the backend is located)*
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free or Starter

### Step 3: Configure Environment Variables in Render
Under the **Environment** tab, add the following key-value pairs:
| Variable | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (or leave default, Render sets `PORT` automatically) |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.fwiux9k.mongodb.net/trustvault?retryWrites=true&w=majority` |
| `JWT_SECRET` | `[generate a secure 64-character random string]` |
| `JWT_EXPIRES_IN`| `24h` |
| `STORAGE_DIR` | `./storage` (or your persistent disk mount path) |
| `MAX_FILE_SIZE_MB`| `15` |
| `CORS_ORIGIN` | `https://your-frontend-domain.onrender.com,http://localhost:5173` |
| `SEED_ADMIN_PASSWORD` | `[SecureAdminPassword]` |
| `SEED_OWNER_PASSWORD` | `[SecureOwnerPassword]` |
| `SEED_VIEWER1_PASSWORD`| `[SecureViewerPassword]` |
| `SEED_VIEWER2_PASSWORD`| `[SecureViewerPassword]` |

> [!WARNING]
> ### Ephemeral Disk Limitation Notice on Render
> Render's default web service instances use **ephemeral disks**. This means any files written to `./storage` will be deleted whenever the service spins down (on the free tier) or when a new deployment is triggered.
> 
> **Production Recommendation:**
> 1. Attach a **Render Persistent Disk** mounted at `/var/data/storage` in your Render Service settings, and set `STORAGE_DIR=/var/data/storage`.
> 2. Alternatively, for cloud-native zero-disk deployments, configure an S3/Google Cloud Storage adapter with client-side envelope encryption.

### Step 4: Run Seeding on Render (Optional)
To initialize your database with the default admin/owner/viewer accounts on Render:
1. Open the **Shell** tab on your deployed Render web service.
2. Run:
   ```bash
   npm run seed
   ```
3. Verify output confirms account initialization.

---

## Security Audit Verification Summary

| Test Case | Method / Route | Expected Result | Verified Status |
| :--- | :--- | :--- | :--- |
| 1. Unauthenticated Request | `GET /api/documents/:id/download` | `401 Unauthorized` | Passed |
| 2. Unshared Viewer Access | `GET /api/documents/:id/download` | `403 Forbidden` + `VIEW_ATTEMPT_DENIED` | Passed |
| 3. Read-Only Viewer Mutation | `PUT /api/documents/:id/share` | `403 Forbidden` | Passed |
| 4. Other Document Owner Access | `GET /api/documents/:id/download` | `403 Forbidden` | Passed |
| 5. Owner & Admin Download | `GET /api/documents/:id/download` | `200 OK` (`nosniff`, `attachment`) | Passed |
| 6. Shared Viewer Download | `GET /api/documents/:id/download` | `200 OK` (Streams contents) | Passed |
| 7. Stale Token Access | `GET /api/auth/me` | `401 Unauthorized` (Revoked) | Passed |
| 8. Immutable Audit Log Tamper | `AuditLog.updateOne()` / `deleteOne()` | Error: Pre-hook Throws | Passed |
| 9. Tampered File Access | `GET /api/documents/:id/download` | `500 Internal Error` (Hash Mismatch) | Passed |
