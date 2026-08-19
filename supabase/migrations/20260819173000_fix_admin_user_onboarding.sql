/*
 * Keep ADMIN-created users aligned with the current auth onboarding trigger.
 *
 * This migration replaces only RPC functions. Existing shops, profiles, and
 * Auth users are preserved.
 */

create or replace function public.create_shop_user(
  p_email text,
  p_full_name text,
  p_role text
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  current_shop_id uuid;
  target_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be authenticated to create a user.';
  end if;

  select shop_id
  into current_shop_id
  from public.profiles
  where id = current_user_id
    and role = 'ADMIN';

  if current_shop_id is null then
    raise exception 'Only shop administrators can create users.';
  end if;

  if p_role not in ('MANAGER', 'STAFF') then
    raise exception 'Only MANAGER or STAFF users can be created.';
  end if;

  if nullif(trim(p_email), '') is null then
    raise exception 'Email is required.';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Full name is required.';
  end if;

  if exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  ) then
    raise exception 'A user with this email already exists.';
  end if;

  target_user_id := gen_random_uuid();

  /*
   * handle_new_user() creates the profile. The metadata is generated here
   * from the current ADMIN's profile; the browser never supplies a shop ID.
   */
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    instance_id,
    target_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email')
    ),
    jsonb_build_object(
      'full_name', trim(p_full_name),
      'onboarding_type', 'SHOP_USER',
      'shop_id', current_shop_id,
      'role', p_role
    ),
    now(),
    now()
  from auth.instances
  limit 1;

  return json_build_object(
    'id', target_user_id,
    'email', lower(trim(p_email)),
    'full_name', trim(p_full_name),
    'role', p_role
  );
end;
$$;

create or replace function public.get_shop_users()
returns table (
  id uuid,
  full_name text,
  role text,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  current_shop_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be authenticated to view users.';
  end if;

  select profiles.shop_id
  into current_shop_id
  from public.profiles
  where profiles.id = current_user_id
    and profiles.role = 'ADMIN';

  if current_shop_id is null then
    raise exception 'Only shop administrators can view users.';
  end if;

  return query
  select
    profiles.id,
    profiles.full_name,
    profiles.role,
    users.email,
    users.created_at,
    users.email_confirmed_at
  from public.profiles as profiles
  join auth.users as users
    on users.id = profiles.id
  where profiles.shop_id = current_shop_id
  order by profiles.created_at asc;
end;
$$;

revoke execute on function public.create_shop_user(text, text, text) from public;
grant execute on function public.create_shop_user(text, text, text) to authenticated;

revoke execute on function public.get_shop_users() from public;
grant execute on function public.get_shop_users() to authenticated;
