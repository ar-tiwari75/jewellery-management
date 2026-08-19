alter table public.shops
  add column subscription_status text not null default 'active',
  add column subscription_expiry_date timestamptz,
  add column subscription_plan text not null default 'free';

comment on column public.shops.subscription_status is 'active, expired, or trial';
comment on column public.shops.subscription_expiry_date is 'Null means no expiry set (unlimited).';
comment on column public.shops.subscription_plan is 'Placeholder for future tiered plans.';
