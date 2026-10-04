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
the request and writes each response to the `wedding_rsvps` table using the
existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server environment
variables. Replies are associated with a wedding ID; a declined reply is
stored with `attending = false` and `guest_count = 0`. The form saves an
optional message and dietary needs, and the route enforces the configured
per-wedding guest limit (up to 10 guests).

Run [`supabase/wedding-rsvps.sql`](./supabase/wedding-rsvps.sql) in the
Supabase SQL Editor to create the table or add the optional message column to an
existing table and refresh the API schema cache. The script is safe to rerun.
If the message column is not yet available, an RSVP is still saved without its
optional note and the guest is told to share that note with the RSVP contact.
Row-level security is enabled and
no guest-facing policies are created; browser clients cannot read or write RSVP
records. The service-role key is used only by the server and must never be
exposed in a `NEXT_PUBLIC_` variable.

No spreadsheet connector or RSVP-specific environment variables are needed.
If Supabase is unavailable or a reply cannot be saved, the form shows an error
and guests can still RSVP by phone or WhatsApp.

## Private admin dashboard

The `/admin` route is intentionally locked. No authentication provider or
admin session system exists in this project, so the route does not query or
expose wedding, guest, RSVP, or uploaded-photo data. Do not deploy an unlocked
admin dashboard publicly. Connect and verify an authentication provider in
`lib/admin-auth.ts` before enabling `getAdminDashboardData`; both the route and
the server-only data-access layer fail closed until then.

The dashboard view is prepared to show each couple, RSVP totals and responses,
and guest-uploaded photo previews. It uses the existing server-only Supabase
variables and table schemas; it does not add database tables or modify the
public RSVP or guest-photo upload flows.

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
