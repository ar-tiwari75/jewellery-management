create table if not exists public.shop_settings (
  id uuid primary key default gen_random_uuid(),

  shop_name text not null,
  gstin text,
  address text,
  city text,
  phone text,
  email text,

  logo_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_settings
enable row level security;

grant select, insert, update
on public.shop_settings
to authenticated;

create policy "Authenticated users can read shop settings"
on public.shop_settings
for select
to authenticated
using (true);

create policy "Authenticated users can create shop settings"
on public.shop_settings
for insert
to authenticated
with check (true);

create policy "Authenticated users can update shop settings"
on public.shop_settings
for update
to authenticated
using (true)
with check (true);