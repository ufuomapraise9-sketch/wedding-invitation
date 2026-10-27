-- Guest photos are uploaded by the server with the service-role key.
-- No browser role receives direct access to photo metadata or storage writes.

create table if not exists public.wedding_guest_photos (
  id uuid primary key default gen_random_uuid(),
  wedding_id text not null check (char_length(wedding_id) between 1 and 100),
  guest_name text check (guest_name is null or char_length(guest_name) <= 80),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint wedding_guest_photos_path_matches_wedding
    check (left(storage_path, char_length(wedding_id) + 1) = wedding_id || '/')
);

alter table public.wedding_guest_photos enable row level security;
revoke all on table public.wedding_guest_photos from public, anon, authenticated;
grant all on table public.wedding_guest_photos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-guest-photos',
  'wedding-guest-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
