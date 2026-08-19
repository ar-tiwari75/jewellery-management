create table if not exists public.daily_metal_rates (
  id uuid primary key default gen_random_uuid(),

  rate_date date not null,
  city text not null default 'Mumbai',

  gold_24k numeric(12, 2) not null,
  gold_22k numeric(12, 2) not null,
  gold_18k numeric(12, 2) not null,

  silver_999 numeric(12, 2) not null,

  gold_unit text not null default '10g',
  silver_unit text not null default '1kg',

  source text,

  fetched_at timestamptz,
  created_at timestamptz not null default now(),

  constraint daily_metal_rates_rate_date_city_key
    unique (rate_date, city),

  constraint daily_metal_rates_city_check
    check (city = 'Mumbai'),

  constraint daily_metal_rates_gold_unit_check
    check (gold_unit = '10g'),

  constraint daily_metal_rates_silver_unit_check
    check (silver_unit = '1kg'),

  constraint daily_metal_rates_positive_check
    check (
      gold_24k > 0
      and gold_22k > 0
      and gold_18k > 0
      and silver_999 > 0
    )
);

alter table public.daily_metal_rates enable row level security;

grant select
on table public.daily_metal_rates
to authenticated;

grant select, insert, update
on table public.daily_metal_rates
to service_role;

create policy "Authenticated users can read daily metal rates"
on public.daily_metal_rates
for select
to authenticated
using (true);