/*
 * Multi-shop / multi-tenant foundation
 *
 * Each authenticated user belongs to one shop.
 * Business data is isolated by shop_id.
 *
 * Existing data is assigned to the first shop created
 * by this migration.
 */


/* =========================================================
   1. Shops
   ========================================================= */

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  gst_number text,

  address text,

  city text,

  state text,

  pincode text,

  phone text,

  email text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

alter table public.shops
enable row level security;

grant select, update
on public.shops
to authenticated;


/* =========================================================
   2. Create first shop for existing installation
   ========================================================= */

insert into public.shops (
  name
)
select
  'Jewellery Shop'
where not exists (
  select 1
  from public.shops
);


/* =========================================================
   3. Profiles → Shop
   ========================================================= */

alter table public.profiles
add column if not exists shop_id uuid;


/*
 * Existing users belong to the first shop.
 */

update public.profiles
set shop_id = (
  select id
  from public.shops
  order by created_at
  limit 1
)
where shop_id is null;


alter table public.profiles
alter column shop_id set not null;


alter table public.profiles
add constraint profiles_shop_id_fkey
foreign key (shop_id)
references public.shops(id)
on delete restrict;


create index if not exists profiles_shop_id_idx
on public.profiles(shop_id);


/* =========================================================
   4. Shops RLS
   ========================================================= */

drop policy if exists
  "Users can view their shop"
on public.shops;

create policy
  "Users can view their shop"
on public.shops
for select
to authenticated
using (
  id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
);


drop policy if exists
  "Users can update their shop"
on public.shops;

create policy
  "Users can update their shop"
on public.shops
for update
to authenticated
using (
  id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
)
with check (
  id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
);


/* =========================================================
   5. Customers → Shop
   ========================================================= */

alter table public.customers
add column if not exists shop_id uuid;


update public.customers
set shop_id = (
  select id
  from public.shops
  order by created_at
  limit 1
)
where shop_id is null;


alter table public.customers
alter column shop_id set not null;


alter table public.customers
add constraint customers_shop_id_fkey
foreign key (shop_id)
references public.shops(id)
on delete restrict;


/*
 * Remove global uniqueness.
 */

alter table public.customers
drop constraint if exists customers_customer_code_key;

alter table public.customers
drop constraint if exists customers_phone_key;


/*
 * Uniqueness is now per shop.
 */

alter table public.customers
add constraint customers_shop_customer_code_unique
unique (shop_id, customer_code);

alter table public.customers
add constraint customers_shop_phone_unique
unique (shop_id, phone);


create index if not exists customers_shop_id_idx
on public.customers(shop_id);


/* =========================================================
   6. Customers RLS
   ========================================================= */

drop policy if exists
  "Authenticated users can view customers"
on public.customers;

drop policy if exists
  "Authenticated users can create customers"
on public.customers;

drop policy if exists
  "Authenticated users can update customers"
on public.customers;

drop policy if exists
  "Authenticated users can delete customers"
on public.customers;


create policy
  "Users can view customers in their shop"
on public.customers
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
  "Users can create customers in their shop"
on public.customers
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
  "Users can update customers in their shop"
on public.customers
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


create policy
  "Users can delete customers in their shop"
on public.customers
for delete
to authenticated
using (
  shop_id = (
    select shop_id
    from public.profiles
    where id = auth.uid()
  )
);


/* =========================================================
   7. Invoices → Shop
   ========================================================= */

alter table public.invoices
add column if not exists shop_id uuid;


update public.invoices
set shop_id = (
  select id
  from public.shops
  order by created_at
  limit 1
)
where shop_id is null;


alter table public.invoices
alter column shop_id set not null;


alter table public.invoices
add constraint invoices_shop_id_fkey
foreign key (shop_id)
references public.shops(id)
on delete restrict;


/*
 * Invoice numbers are unique per shop.
 */

alter table public.invoices
drop constraint if exists invoices_invoice_number_key;

alter table public.invoices
add constraint invoices_shop_invoice_number_unique
unique (shop_id, invoice_number);


create index if not exists invoices_shop_id_idx
on public.invoices(shop_id);


/* =========================================================
   8. Invoice RLS
   ========================================================= */

drop policy if exists
  "Authenticated users can read invoices"
on public.invoices;

drop policy if exists
  "Authenticated users can create invoices"
on public.invoices;

drop policy if exists
  "Authenticated users can update invoices"
on public.invoices;


create policy
  "Users can read invoices in their shop"
on public.invoices
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
  "Users can create invoices in their shop"
on public.invoices
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
  "Users can update invoices in their shop"
on public.invoices
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


/* =========================================================
   9. Invoice Items
   ========================================================= */

/*
 * invoice_items do NOT need shop_id.
 *
 * They inherit shop ownership through invoices.
 */

drop policy if exists
  "Authenticated users can read invoice items"
on public.invoice_items;

drop policy if exists
  "Authenticated users can create invoice items"
on public.invoice_items;

drop policy if exists
  "Authenticated users can update invoice items"
on public.invoice_items;


create policy
  "Users can read invoice items in their shop"
on public.invoice_items
for select
to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.shop_id = (
        select shop_id
        from public.profiles
        where id = auth.uid()
      )
  )
);


create policy
  "Users can create invoice items in their shop"
on public.invoice_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.shop_id = (
        select shop_id
        from public.profiles
        where id = auth.uid()
      )
  )
);


create policy
  "Users can update invoice items in their shop"
on public.invoice_items
for update
to authenticated
using (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.shop_id = (
        select shop_id
        from public.profiles
        where id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.invoices
    where invoices.id = invoice_items.invoice_id
      and invoices.shop_id = (
        select shop_id
        from public.profiles
        where id = auth.uid()
      )
  )
);


/* =========================================================
   10. Shop Settings → Shop
   ========================================================= */

alter table public.shop_settings
add column if not exists shop_id uuid;


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


alter table public.shop_settings
add constraint shop_settings_shop_id_fkey
foreign key (shop_id)
references public.shops(id)
on delete cascade;


/*
 * One settings record per shop.
 */

alter table public.shop_settings
add constraint shop_settings_shop_id_unique
unique (shop_id);


create index if not exists shop_settings_shop_id_idx
on public.shop_settings(shop_id);


/* =========================================================
   11. Shop Settings RLS
   ========================================================= */

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
  "Users can read settings in their shop"
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
  "Users can create settings in their shop"
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
  "Users can update settings in their shop"
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


/* =========================================================
   12. Profile RLS
   ========================================================= */

drop policy if exists
  "Users can view their own profile"
on public.profiles;

drop policy if exists
  "Users can update their own profile"
on public.profiles;


create policy
  "Users can view their own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
);


create policy
  "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


/* =========================================================
   13. Updated user trigger
   ========================================================= */

/*
 * New users cannot automatically choose a shop.
 *
 * The application will assign the user to a shop
 * during onboarding/admin setup.
 *
 * Therefore the trigger continues creating the profile,
 * but shop_id is intentionally not supplied here.
 */

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  /*
   * New-user creation is handled by the application.
   *
   * This trigger only creates the profile if a profile
   * does not already exist.
   */

  insert into public.profiles (
    id,
    full_name,
    role,
    shop_id
  )
  select
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      'User'
    ),
    'STAFF',
    (
      select id
      from public.shops
      order by created_at
      limit 1
    )
  where exists (
    select 1
    from public.shops
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


/* =========================================================
   14. Permissions
   ========================================================= */

grant select
on public.shops
to authenticated;

grant update
on public.shops
to authenticated;

grant select, insert, update
on public.shop_settings
to authenticated;