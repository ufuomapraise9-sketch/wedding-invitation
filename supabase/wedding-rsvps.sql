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

alter table public.wedding_rsvps
  add column if not exists email text
  check (email is null or char_length(email) <= 254);

alter table public.wedding_rsvps
  add column if not exists phone text
  check (phone is null or char_length(phone) <= 40);

alter table public.wedding_rsvps
  add column if not exists phone_normalized text;

alter table public.wedding_rsvps
  add column if not exists phone_duplicate_legacy boolean not null default false;

alter table public.wedding_rsvps
  add column if not exists ticket_token uuid;

alter table public.wedding_rsvps
  add column if not exists checked_in_at timestamptz;

update public.wedding_rsvps
set ticket_token = gen_random_uuid()
where attending = true and ticket_token is null;

alter table public.wedding_rsvps
  alter column ticket_token set default gen_random_uuid();

create or replace function public.normalize_wedding_rsvp_phone(input_phone text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when normalized.digits ~ '^0[0-9]{10}$'
      then '234' || substr(normalized.digits, 2)
    else nullif(normalized.digits, '')
  end
  from (
    select regexp_replace(coalesce(input_phone, ''), '[^0-9]', '', 'g') as digits
  ) as normalized;
$$;

update public.wedding_rsvps
set phone_normalized = public.normalize_wedding_rsvp_phone(phone),
    phone_duplicate_legacy = false;

with duplicate_phones as (
  select wedding_id, phone_normalized
  from public.wedding_rsvps
  where phone_normalized is not null
  group by wedding_id, phone_normalized
  having count(*) > 1
)
update public.wedding_rsvps as rsvp
set phone_duplicate_legacy = true
from duplicate_phones as duplicate
where rsvp.wedding_id = duplicate.wedding_id
  and rsvp.phone_normalized = duplicate.phone_normalized;

create or replace function public.prevent_duplicate_wedding_rsvp_phone()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.phone_normalized := public.normalize_wedding_rsvp_phone(new.phone);
  new.phone_duplicate_legacy := false;

  if new.phone_normalized is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.wedding_id || ':' || new.phone_normalized, 0)
  );

  if exists (
    select 1
    from public.wedding_rsvps as existing
    where existing.wedding_id = new.wedding_id
      and existing.phone_normalized = new.phone_normalized
      and existing.id is distinct from new.id
  ) then
    raise exception using
      errcode = '23505',
      constraint = 'wedding_rsvps_phone_duplicate_guard',
      message = 'This phone number has already been used for an RSVP for this wedding.';
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_wedding_rsvp_phone(text) from public, anon, authenticated;
grant execute on function public.normalize_wedding_rsvp_phone(text) to service_role;
revoke all on function public.prevent_duplicate_wedding_rsvp_phone() from public, anon, authenticated;
grant execute on function public.prevent_duplicate_wedding_rsvp_phone() to service_role;

drop trigger if exists wedding_rsvps_prevent_duplicate_phone on public.wedding_rsvps;
create trigger wedding_rsvps_prevent_duplicate_phone
before insert or update of wedding_id, phone on public.wedding_rsvps
for each row execute function public.prevent_duplicate_wedding_rsvp_phone();

create unique index if not exists wedding_rsvps_wedding_phone_normalized_uidx
  on public.wedding_rsvps (wedding_id, phone_normalized)
  where phone_normalized is not null and not phone_duplicate_legacy;

create index if not exists wedding_rsvps_wedding_created_at_idx
  on public.wedding_rsvps (wedding_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'wedding_rsvps_attending_ticket_token_check'
      and conrelid = 'public.wedding_rsvps'::regclass
  ) then
    alter table public.wedding_rsvps
      add constraint wedding_rsvps_attending_ticket_token_check
      check (not attending or ticket_token is not null);
  end if;
end;
$$;

create unique index if not exists wedding_rsvps_ticket_token_uidx
  on public.wedding_rsvps (ticket_token)
  where ticket_token is not null;

alter table public.wedding_rsvps enable row level security;
revoke all on table public.wedding_rsvps from public, anon, authenticated;
grant all on table public.wedding_rsvps to service_role;

notify pgrst, 'reload schema';
