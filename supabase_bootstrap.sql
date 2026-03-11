-- WaterLeakApp - Supabase bootstrap SQL
-- This file collects the core Postgres schema your app code relies on.
-- Run it in the Supabase SQL Editor (or psql) in a NEW project.
--
-- NOTE:
-- - Supabase Auth tables (auth.users, etc.) are created by Supabase automatically.
-- - Your app stores extra profile fields in public.users and references auth.users.id.
-- - Storage buckets and RLS policies are configured in the Supabase Dashboard.
--
-- Tables referenced in code:
-- - public.users
-- - public.leak_requests
-- - public.technician_locations
-- Storage bucket referenced in code:
-- - storage bucket: "image"
--
-- Realtime channels in code:
-- - leak_requests UPDATE by id
-- - leak_requests INSERT where status='pending'

begin;

-- ---------- Extensions ----------
create extension if not exists pgcrypto;

-- ---------- public.users ----------
-- Used in:
-- - AuthContext: select role by id
-- - SignUpScreen: insert profile row
-- - JobDetailScreen: update is_available
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null check (role in ('client', 'technician')),
  is_available boolean,
  push_token text,
  created_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);
create index if not exists users_is_available_idx on public.users(is_available);

-- ---------- public.leak_requests ----------
-- Used in:
-- - ReportLeakScreen: insert new request with photo_url, description, lat/lng, status, price
-- - WaitingScreen: select status, price, technician name; update status='cancelled'
-- - TechnicianDashboard: list pending requests
-- - JobDetailScreen: update status assigned/done; set technician_id; set price_confirmed
create table if not exists public.leak_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  technician_id uuid references public.users(id) on delete set null,
  photo_url text,
  description text not null,
  client_lat double precision not null,
  client_lng double precision not null,
  status text not null check (status in ('pending', 'looking', 'assigned', 'in_progress', 'done', 'cancelled')),
  price numeric,
  price_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leak_requests_status_idx on public.leak_requests(status);
create index if not exists leak_requests_created_at_idx on public.leak_requests(created_at desc);
create index if not exists leak_requests_client_id_idx on public.leak_requests(client_id);
create index if not exists leak_requests_technician_id_idx on public.leak_requests(technician_id);

-- Keep updated_at fresh on updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leak_requests_updated_at on public.leak_requests;
create trigger trg_leak_requests_updated_at
before update on public.leak_requests
for each row execute function public.set_updated_at();

-- ---------- public.technician_locations ----------
-- Used in TechnicianDashboard: upsert technician's location each refresh
create table if not exists public.technician_locations (
  technician_id uuid primary key references public.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

commit;

-- ---------- Storage bucket note ----------
-- Your app uploads leak photos to a Storage bucket named "image".
-- Create it in the Supabase Dashboard: Storage -> Buckets -> New bucket -> name: image
-- If you keep the app as-is (publicUrl), configure the bucket to allow public read
-- OR implement signed URLs + appropriate RLS policies.

