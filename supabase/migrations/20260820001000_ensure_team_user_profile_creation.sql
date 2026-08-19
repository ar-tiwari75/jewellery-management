/*
 * =========================================================
 * Ensure profile creation for invited shop members & permissions
 * =========================================================
 *
 * When an ADMIN invites a user via create-shop-user edge function,
 * auth.users metadata includes onboarding_type = 'SHOP_USER',
 * shop_id, and role.
 *
 * This migration:
 * 1. Grants full table permissions to service_role and authenticated.
 * 2. Updates the handle_new_user trigger to handle SHOP_USER.
 * 3. Backfills any invited users currently missing from public.profiles.
 */

-- 1. Grant table access to service_role and authenticated roles
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all routines in schema public to authenticated;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- 2. Update handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_shop_id uuid;
  new_shop_name text;
  new_full_name text;
  onboarding_type text;
  existing_shop_id uuid;
  requested_role text;
begin
  new_full_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  onboarding_type := trim(coalesce(new.raw_user_meta_data ->> 'onboarding_type', ''));
  new_shop_name := trim(coalesce(new.raw_user_meta_data ->> 'shop_name', ''));

  /*
   * 1. SHOP OWNER ONBOARDING (via public signup)
   */
  if new_shop_name <> '' or onboarding_type = 'OWNER' then
    if new_shop_name = '' then
      raise exception 'Shop name is required during signup.';
    end if;

    if new_full_name = '' then
      raise exception 'Full name is required during signup.';
    end if;

    insert into public.shops (name)
    values (new_shop_name)
    returning id into new_shop_id;

    insert into public.profiles (id, full_name, role, shop_id)
    values (new.id, new_full_name, 'ADMIN', new_shop_id)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = excluded.role,
      shop_id = excluded.shop_id;

    return new;
  end if;

  /*
   * 2. INVITED TEAM MEMBER ONBOARDING (via Admin invite / Edge function)
   */
  if onboarding_type = 'SHOP_USER' then
    existing_shop_id := nullif(trim(coalesce(new.raw_user_meta_data ->> 'shop_id', '')), '')::uuid;
    requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'STAFF');

    if existing_shop_id is not null and requested_role in ('MANAGER', 'STAFF') then
      insert into public.profiles (id, full_name, role, shop_id)
      values (new.id, coalesce(nullif(new_full_name, ''), 'Team Member'), requested_role, existing_shop_id)
      on conflict (id) do update set
        full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
        role = excluded.role,
        shop_id = excluded.shop_id;
    end if;

    return new;
  end if;

  return new;
end;
$$;

-- 3. Backfill any invited users in auth.users missing from public.profiles
insert into public.profiles (id, full_name, role, shop_id)
select 
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), 'Team Member'),
  coalesce(nullif(u.raw_user_meta_data ->> 'role', ''), 'STAFF'),
  (u.raw_user_meta_data ->> 'shop_id')::uuid
from auth.users u
where (u.raw_user_meta_data ->> 'onboarding_type') = 'SHOP_USER'
  and (u.raw_user_meta_data ->> 'shop_id') is not null
  and not exists (
    select 1 from public.profiles p where p.id = u.id
  )
on conflict (id) do nothing;
