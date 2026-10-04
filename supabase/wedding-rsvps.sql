create table if not exists public.wedding_rsvps (
  id uuid primary key default gen_random_uuid(),
  wedding_id text not null,
  guest_name text not null check (char_length(guest_name) between 1 and 100),
  attending boolean not null,
  guest_count integer not null check (guest_count >= 0),
  dietary_needs text not null default '' check (char_length(dietary_needs) <= 500),
  message text not null default '' check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  constraint wedding_rsvps_guest_count_matches_attendance check (
    (attending and guest_count >= 1) or (not attending and guest_count = 0)
  )
);

alter table public.wedding_rsvps
  add column if not exists message text not null default ''
  check (char_length(message) <= 500);

create index if not exists wedding_rsvps_wedding_created_at_idx
  on public.wedding_rsvps (wedding_id, created_at desc);

alter table public.wedding_rsvps enable row level security;

revoke all on table public.wedding_rsvps from public, anon, authenticated;
grant all on table public.wedding_rsvps to service_role;

notify pgrst, 'reload schema';
