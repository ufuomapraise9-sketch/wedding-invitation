# The JP's Wedding Invitation

Jennifer Itaire and Odjegba Princewill's invitation is maintained as the
`jennifer-odjegba` record in [`data/weddings.ts`](./data/weddings.ts). Their
invitation includes the traditional marriage, church wedding, reception,
countdown, family welcome, guest photo sharing, and RSVP details.

The couple portrait and personal photo gallery remain graceful placeholders
until the couple's photos are provided. Guest-submitted photos are stored
separately for this wedding ID in Supabase.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Save RSVP replies in Supabase

The RSVP form posts to the server-only `/api/rsvp` route. The route validates
the request and writes each response to the `public.wedding_rsvps` table using
the existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server environment
variables. Replies are associated with a wedding ID; a declined reply is
stored with `attending = false` and `guest_count = 0`. The existing
`guest_count` and `dietary_needs` columns are used as named in the database.
Email and message are optional. A phone number is required for an online RSVP
and is normalized so common Nigerian local and international formats match.
Each phone number can be used once per wedding.

Run [`supabase/wedding-rsvps.sql`](./supabase/wedding-rsvps.sql) in the
Supabase SQL Editor to create or update the RSVP table, add optional `email` and
`phone` columns, add private ticket tokens and check-in timestamps, backfill
tokens for existing attending RSVPs, enforce per-wedding phone uniqueness, and
refresh the API schema cache. Existing duplicate phone groups are retained and
marked as legacy conflicts; those numbers cannot be used for additional RSVPs.
Attending guests receive a QR ticket after submitting the form; the code
contains only an opaque token. If the message column is not available, the RSVP
is still saved without the message and the guest is notified.
Row-level security is enabled and no guest-facing policies are created; browser
clients cannot read or write RSVP records. The service-role key is used only by
the server and must never be exposed in a `NEXT_PUBLIC_` variable.

The RSVP flow does not call an AI provider or read a Gemini API key. No
spreadsheet connector or additional RSVP-specific environment variables are
needed.
If Supabase is unavailable or a reply cannot be saved, the form shows an error
and guests can still RSVP by phone or WhatsApp.

## Private admin dashboard

The `/admin` route redirects unauthenticated users to `/admin/login`. Sign-in
uses Supabase email/password authentication with a server-verified session.
Configure these server-side environment variables:

- `SUPABASE_URL` — the existing Supabase project URL.
- `SUPABASE_ANON_KEY` — the project's anon/publishable API key. It is used only
  by server-side authentication code and is not sent to the browser.
- `ADMIN_EMAILS` — comma-separated email addresses allowed to access the admin
  dashboard.

The dashboard also requires the existing server-only
`SUPABASE_SERVICE_ROLE_KEY` for its data reads. That key is never used by the
login form or exposed to the browser. Configure email/password sign-in in
Supabase Authentication, create or invite the first admin under **Authentication
→ Users**, add that account's email to `ADMIN_EMAILS`, then restart/redeploy the
application. Keep public sign-ups disabled; only explicitly allowlisted,
email-confirmed accounts can view the dashboard. Administrators can end their
session with the **Sign out** button.

Once authentication is configured, the dashboard shows each couple, RSVP
totals and responses (including guest email and phone when available), and
guest-uploaded photo previews. Admins can open the ticket scanner to validate
an attending guest's QR code and check in that RSVP party once. Camera access
requires HTTPS in production (or localhost during development). Check-in
timestamps are shown in the RSVP table. The dashboard and check-in route use
the existing server-only Supabase variables; privileged credentials and ticket
tokens are not exposed in admin data or QR URLs.

## Connect guest wedding photo uploads to Supabase

Each invitation's **Share Your Moments** section uses the wedding ID in the URL.
Guest photos and optional guest names are saved under that ID, so each couple's
gallery remains separate. Guests can upload up to five JPG, PNG, or WEBP images
per submission, up to 8 MB per image and 25 MB combined. The API checks the
image signature, stores originals in Supabase Storage, and saves gallery
metadata in a table whose direct access is restricted to the server.

Photo uploads are persistent only after the Supabase connection is configured:

1. Create a Supabase project and open its **SQL Editor**.
2. Run [`supabase/wedding-photos.sql`](./supabase/wedding-photos.sql) to create
   the wedding-photo metadata table and public-read, server-write image bucket.
3. Copy `.env.example` to `.env.local` and set the two server-only values:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   Find the project URL and service-role key under the Supabase project's API
   settings. Keep the service-role key private: it bypasses database row-level
   security and must never be exposed in a `NEXT_PUBLIC_` variable.
4. Restart `npm run dev`. For production, add both variables to the hosting
   provider's server environment and redeploy.

Without these settings the section explicitly reports that photo sharing is
not configured; it does not claim that local previews have been saved. Photo
records include a UUID, wedding ID, optional sanitized guest name, storage path,
and creation time, providing the data needed for a future couple/admin view.
The public gallery currently supports viewing and lightbox display; deletion
and moderation should be added behind authenticated couple/admin access.
