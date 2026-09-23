# Admin App Push Notifications — Phase 1 (subscription setup)

Phase 1 stores Web Push subscriptions for authenticated admins. **No automatic or test push sends** are implemented yet (Phase 2).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Server (+ exposed to admin via authenticated API) | Application Server Key for `pushManager.subscribe` |
| `VAPID_PRIVATE_KEY` | **Server only** | Used in Phase 2 to sign push requests. Never expose to the browser or commit to git. |
| `VAPID_SUBJECT` | Server only | Contact URI required by the Web Push protocol, e.g. `mailto:it@smartoptionacademy.com` |

Do **not** prefix the private key with `NEXT_PUBLIC_`.

## Generate VAPID keys (local)

Use `npx` so you do not need to add a dependency:

```bash
npx --yes web-push generate-vapid-keys
```

Copy the printed public and private keys into your local env file (e.g. `.env.local`):

```env
VAPID_PUBLIC_KEY=<public key from generate-vapid-keys>
VAPID_PRIVATE_KEY=<private key from generate-vapid-keys>
VAPID_SUBJECT=mailto:it@smartoptionacademy.com
```

Restart `npm run dev` after changing env vars.

## Configure on Vercel

1. Project → **Settings** → **Environment Variables**
2. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` for Production (and Preview if needed)
3. Redeploy so the runtime picks up the new values

Use the **same key pair** across environments only if you intentionally want shared subscriptions; otherwise generate a separate pair for production.

## Apply the migration

Migration file:

`supabase/migrations/20260922140000_admin_push_subscriptions.sql`

Apply with your usual process, for example:

```bash
npx supabase db push
```

Or run the SQL in the Supabase SQL Editor. Confirm the table `admin_push_subscriptions` exists with RLS enabled and no policies for `anon` / `authenticated`.

## Service Worker scope

- File: `public/admin-app/sw.js`
- URL: `/admin-app/sw.js`
- **Default browser scope: `/admin-app/`**
- Registered with `{ scope: "/admin-app/" }`
- Does **not** intercept fetch/network traffic
- Does **not** affect `/`, `/admin`, Zoom, or other routes

## Phase 2 (not in this phase)

- Send push when admin-worthy events occur (reuse `admin_notifications` hooks)
- Optional test-send endpoint
- Cleanup of expired/invalid endpoints after 410/404 from push services
