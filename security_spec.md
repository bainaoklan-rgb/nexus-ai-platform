# Security Specification — NEXUS AI STUDIO

## 1. Data Invariants
1. **Identity & Privilege Escalation Guard**: No user can set `role: 'admin'` or upgrade their own `planId` (`pro`, `studio`) on `/users/{userId}` via client SDK. Standard users can only create their initial `/users/{userId}` document with `role == 'user'` and `planId == 'free'`.
2. **PII Isolation**: `/user_profiles/{userId}` contains `email` and `phone`. Only the owner (`request.auth.uid == userId`) or an verified Admin can read or write `/user_profiles/{userId}`.
3. **Admin Verification**: `isAdmin()` requires `isSignedIn()`, `request.auth.token.email_verified == true`, and either the bootstrapped owner email (`bainaoklan@gmail.com`) or existence of `/admins/$(request.auth.uid)`.
4. **Relational Integrity (Master Gate)**: Every `saved_projects`, `usage_history`, `orders`, and `support_tickets` creation requires `exists(/databases/$(database)/documents/users/$(request.auth.uid))` so orphaned records cannot exist without a valid user account.
5. **Terminal State Locking**: Once an `Order` reaches `approved`, `refunded`, or `cancelled`, or a `SupportTicket` reaches `closed`, non-admin users cannot mutate the document.
6. **Temporal Integrity**: Every `createdAt` must equal `request.time` on `create` and remain immutable on `update`. Every `updatedAt` must equal `request.time` on `create` and `update`.
7. **Secure List Queries**: Every `allow list` on private collections (`orders`, `payments`, `subscriptions`, `usage_history`, `saved_projects`, `support_tickets`) explicitly validates `resource.data.userId == request.auth.uid || isAdmin()`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on User Create**: `{ uid: "u1", displayName: "A", photoURL: "", role: "user", planId: "free", isSuperAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `hasOnly()`.
2. **Self-Assigned Admin Role on User Create**: `{ uid: "u1", displayName: "A", photoURL: "", role: "admin", planId: "free", createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected by `incoming().role == 'user'` check for non-admins.
3. **Client-Side Plan Upgrade on User Update**: Updating `/users/u1` with `{ planId: "studio" }` as non-admin -> Rejected by action-based `affectedKeys().hasOnly(['displayName', 'photoURL', 'updatedAt'])`.
4. **Unverified Email Admin Spoof**: Token with `email: "bainaoklan@gmail.com"` and `email_verified: false` attempting admin write -> Rejected by `isVerifiedUser()`.
5. **Cross-User PII Read**: User `u2` attempting `get` on `/user_profiles/u1` -> Rejected by `isOwner(userId) || isAdmin()`.
6. **Unbounded List Scraping on Saved Projects**: Authenticated user querying `/saved_projects` without `where('userId', '==', uid)` -> Rejected by `resource.data.userId == request.auth.uid`.
7. **Orphaned Project Creation**: User without `/users/{uid}` document creating `/saved_projects/p1` -> Rejected by `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
8. **ID Poisoning Attack**: Creating `/saved_projects/invalid$id!@#` -> Rejected by `isValidId(projectId)`.
9. **Denial-of-Wallet String Exhaustion**: Creating `/saved_projects/p1` with a 50,000-char `content` string -> Rejected by `data.content.size() <= 15000`.
10. **Client-Side Order Approval**: User updating `/orders/o1` status from `pending_pix` to `approved` -> Rejected because non-admin users can only transition `status` to `cancelled` from non-terminal states.
11. **Terminal State Mutation**: User updating `/support_tickets/t1` when `existing().status == 'closed'` -> Rejected by terminal state lock.
12. **Forged Timestamp Backdating**: Creating `/usage_history/h1` with `createdAt: Timestamp(2020, 1, 1)` -> Rejected by `incoming().createdAt == request.time`.

## 3. Red Team Audit & Conflict Report
- `users`: Identity Spoofing blocked (`uid == userId == request.auth.uid`). Privilege escalation blocked (`role == 'user' && planId == 'free'`).
- `user_profiles`: PII Blanket Test passed (strictly `isOwner(userId) || isAdmin()`).
- `admins`: Only `isAdmin()` can read or write.
- `subscriptions`: Only `isAdmin()` can create/update; users can only read their own (`resource.data.userId == request.auth.uid`).
- `products`: Publicly readable catalog; strictly `isAdmin()` for create/update/delete.
- `orders`: Users can create `pending_configuration` or `pending_pix` orders for themselves; only `isAdmin()` can mark `approved` or `refunded`.
- `payments`: Strictly created/updated by `isAdmin()`; readable by owner or admin.
- `usage_history`: Immutable log entries created by owner with valid schema and `request.time`.
- `saved_projects`: Full CRUD for owner with strict schema validation (`isValidSavedProject(incoming())`) on both create and update.
- `support_tickets`: Created by owner (`status == 'open'`, `adminReply == ''`); owner can update message while not `closed`; admin can reply and change status.
- `app_settings`: Publicly readable platform settings/terms; strictly `isAdmin()` for writes.
