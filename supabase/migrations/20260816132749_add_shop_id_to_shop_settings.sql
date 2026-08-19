alter table public.shop_settings
add column if not exists shop_id uuid
references public.shops(id)
on delete cascade;

update public.shop_settings
set shop_id = (
  select id
  from public.shops
  order by created_at
  limit 1
)
where shop_id is null;

alter table public.shop_settings
alter column shop_id set not null;

create index if not exists shop_settings_shop_id_idx
on public.shop_settings(shop_id);

alter table public.shop_settings
drop constraint if exists shop_settings_shop_id_unique;

alter table public.shop_settings
add constraint shop_settings_shop_id_unique
unique (shop_id);

drop policy if exists
  "Authenticated users can read shop settings"
on public.shop_settings;

drop policy if exists
  "Authenticated users can create shop settings"
on public.shop_settings;

drop policy if exists
  "Authenticated users can update shop settings"
on public.shop_settings;

create policy
  "Users can read shop settings in their shop"
on public.shop_settings
for select
to authenticated
using (
  shop_id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
);

create policy
  "Users can create shop settings in their shop"
on public.shop_settings
for insert
to authenticated
with check (
  shop_id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
);

create policy
  "Users can update shop settings in their shop"
on public.shop_settings
for update
to authenticated
using (
  shop_id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
)
with check (
  shop_id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
);