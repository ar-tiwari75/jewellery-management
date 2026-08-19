create table public.customers (
    id uuid primary key default gen_random_uuid(),

    customer_code text not null unique,

    full_name text not null,

    phone text not null unique,

    email text,

    date_of_birth date,

    anniversary_date date,

    address text,

    city text,

    notes text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create index customers_full_name_idx
on public.customers (full_name);

alter table public.customers enable row level security;

grant select, insert, update, delete
on public.customers
to authenticated;

create policy "Authenticated users can view customers"
on public.customers
for select
to authenticated
using (true);

create policy "Authenticated users can create customers"
on public.customers
for insert
to authenticated
with check (true);

create policy "Authenticated users can update customers"
on public.customers
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete customers"
on public.customers
for delete
to authenticated
using (true);