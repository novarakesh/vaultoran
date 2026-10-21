# Development & Prompt Log — Vaultoran

**Author:** Nova Rakesh  
**Project:** Vaultoran  
**Stack:** React 19, Tailwind CSS, Node.js, Express, MongoDB, JWT, Jest

---

### How I Used AI
I used AI as a pair programmer to scaffold boilerplate routes, schemas, and UI components quickly. However, I drove the security design, caught several security oversights in the generated code, and debugged deployment issues myself.

---

### Prompts & Features Implemented

1. **Architecture & Project Setup**
   - *Prompt:* Help scaffold a clean Node/Express backend with MVC folder structure (`config`, `controllers`, `middleware`, `models`, `routes`) and JWT auth.
   - *Result:* Set up basic auth, MongoDB models (`User`, `Document`, `AuditLog`), and middleware.

2. **Access Control & Permissions**
   - *Prompt:* Create an authorization middleware that checks if the user is owner, admin, or in `sharedWith` array.
   - *Result:* Implemented `authorizeDocumentAccess` supporting `read` (view/download only) and `edit` (update title/category and upload revisions).

3. **Frontend Dashboards & Theming**
   - *Prompt:* Create modern dark/light mode role portals in React: Owner Portal (upload, delegate access), Viewer Dashboard (compartments by clearance), and Admin Console (audit logs).
   - *Result:* Built responsive, role-tailored views with quick demo login buttons and live audit stream.

---

### Bugs & Security Gaps I Caught & Fixed

- **Signup Role Escalation:** The initial AI signup controller saved whatever `role` was sent in the body. I fixed this by adding server validation that rejects `admin` signups with HTTP 400.
- **Audit Log Query Bypass:** AI only added pre-hooks to `save()` and `deleteOne()`. In Mongoose, queries like `AuditLog.deleteMany()` or `AuditLog.updateOne()` bypass those hooks. I added hooks specifically for query middleware (`{ query: true }`) so logs are truly immutable.
- **Render Cold-Start Latency:** Because Render free-tier sleeps after 15 minutes, first logins hung for 30–50s. I fixed this by:
  - Adding a non-blocking health check ping (`fetch('/api/health')`) in `index.html` `<head>` to wake the server immediately on page load.
  - Refactoring `server.js` to bind the HTTP port right away instead of waiting for MongoDB connection.
- **Viewer Dropdown Bug:** The owner clearance console was calling an unmapped route (`/api/users/viewers`), which caused the viewer dropdown to show empty. I fixed the backend route and added fallback to `/api/users` with current-user filtering.

---

### Takeaway
AI was great for writing repetitive CRUD code, but you have to carefully review security logic, database hooks, and edge cases yourself.
