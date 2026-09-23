# Admin App Push Notifications

## Phase 1 — subscription setup

Phase 1 stores Web Push subscriptions for authenticated admins.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Server (+ exposed to admin via authenticated API) | Application Server Key for `pushManager.subscribe` |
| `VAPID_PRIVATE_KEY` | **Server only** | Signs push requests. Never expose to the browser or commit to git. |
| `VAPID_SUBJECT` | Server only | Contact URI required by the Web Push protocol, e.g. `mailto:it@smartoptionacademy.com` |

Do **not** prefix the private key with `NEXT_PUBLIC_`.

### Generate VAPID keys (local)

```bash
npx --yes web-push generate-vapid-keys
```

```env
VAPID_PUBLIC_KEY=<public key from generate-vapid-keys>
VAPID_PRIVATE_KEY=<private key from generate-vapid-keys>
VAPID_SUBJECT=mailto:it@smartoptionacademy.com
```

### Service Worker scope

- File: `public/admin-app/sw.js`
- URL: `/admin-app/sw.js`
- Default browser scope: `/admin-app/`
- Registered with `{ scope: "/admin-app/" }`
- Does **not** intercept fetch/network traffic

### Migration

`supabase/migrations/20260922140000_admin_push_subscriptions.sql`

## Phase 2 — new student enrollment delivery

### Event source

Push is triggered from `notifyNewStudentCreated` in `lib/adminNotifications.ts` **after** a successful `admin_notifications` insert (`type = new_student`).

Call sites (unchanged business logic) include Stripe webhook fulfillment, pre-enrollment, admin provisioning, and related helpers. Each already gates on “student did not already exist” where applicable. Stripe webhook event idempotency remains separate and unchanged.

### Sender

- `lib/adminPushSend.ts` uses `web-push` with VAPID from `getAdminPushVapidConfig()`
- Loads subscriptions via service-role Supabase client
- Payload: title `Smart Option Academy`, body `New student enrollment received.`, url `/admin-app/enrollments`
- Best-effort: failures never throw into enrollment/payment flows
- HTTP 404/410 → delete that subscription row and continue

### Duplicate push prevention

1. Existing call-site `!existed` / insert-only paths (primary — no notify on existing students)
2. Stripe webhook event claim (unchanged)
3. Push claim: only the oldest `new_student` row for that email in a 24h window may send (`created_at`, then `id`). Concurrent inserts share one winner; a second insert for the same email does not send again.

### Test push

- `POST /api/admin/push/test` — requires admin session cookie
- Sends only to the authenticated admin’s subscriptions
- Does **not** create `admin_notifications` rows
- Success means the push provider accepted the request, not confirmed device display
- Settings UI: **Send test notification** when status is enabled
