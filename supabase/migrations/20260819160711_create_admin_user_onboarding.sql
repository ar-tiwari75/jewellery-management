/*
 * =========================================================
 * ADMIN user onboarding
 * =========================================================
 *
 * Allows an ADMIN to create MANAGER / STAFF users
 * inside their own shop.
 *
 * Important:
 *
 * - The ADMIN's shop_id is determined from auth.uid().
 * - The caller cannot supply a shop_id.
 * - Shop names are irrelevant here.
 * - Existing users and existing tenant data are untouched.
 * - Only MANAGER and STAFF can be created through this flow.
 * - ADMIN creation remains restricted to initial shop signup.
 *
 * =========================================================
 */


/* =========================================================
   1. Create onboarding function
   ========================================================= */

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
  existing_profile public.profiles;
begin

  /*
   * -------------------------------------------------------
   * Get currently authenticated user
   * -------------------------------------------------------
   */

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception
      'You must be authenticated to create a user.';
  end if;


  /*
   * -------------------------------------------------------
   * Determine caller's shop
   * -------------------------------------------------------
   */

  select
    shop_id
  into
    current_shop_id
  from public.profiles
  where id = current_user_id;


  if current_shop_id is null then
    raise exception
      'Your account is not associated with a shop.';
  end if;


  /*
   * -------------------------------------------------------
   * Verify caller is ADMIN
   * -------------------------------------------------------
   */

  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and shop_id = current_shop_id
      and role = 'ADMIN'
  ) then
    raise exception
      'Only shop administrators can create users.';
  end if;


  /*
   * -------------------------------------------------------
   * Validate role
   * -------------------------------------------------------
   *
   * ADMIN users must not be created through this function.
   * The first ADMIN is created during shop onboarding.
   */

  if p_role not in ('MANAGER', 'STAFF') then
    raise exception
      'Only MANAGER or STAFF users can be created.';
  end if;


  /*
   * -------------------------------------------------------
   * Validate email
   * -------------------------------------------------------
   */

  if nullif(trim(p_email), '') is null then
    raise exception
      'Email is required.';
  end if;


  /*
   * -------------------------------------------------------
   * Validate full name
   * -------------------------------------------------------
   */

  if nullif(trim(p_full_name), '') is null then
    raise exception
      'Full name is required.';
  end if;


  /*
   * -------------------------------------------------------
   * Check whether this email already exists
   * -------------------------------------------------------
   *
   * auth.users is globally unique.
   *
   * Therefore an email cannot be reused across
   * different shops either.
   */

  if exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_email))
  ) then
    raise exception
      'A user with this email already exists.';
  end if;


  /*
   * -------------------------------------------------------
   * Create Auth user
   * -------------------------------------------------------
   *
   * We intentionally do NOT use auth.signUp() here.
   *
   * This function runs with SECURITY DEFINER privileges,
   * allowing ADMIN-created users without changing the
   * currently authenticated browser session.
   */

  target_user_id := gen_random_uuid();


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
      'full_name', trim(p_full_name)
    ),
    now(),
    now()
  from auth.instances
  limit 1;


  /*
   * -------------------------------------------------------
   * Create shop profile
   * -------------------------------------------------------
   */

  insert into public.profiles (
    id,
    full_name,
    role,
    shop_id
  )
  values (
    target_user_id,
    trim(p_full_name),
    p_role,
    current_shop_id
  );


  /*
   * -------------------------------------------------------
   * Return created user information
   * -------------------------------------------------------
   */

  return json_build_object(
    'id', target_user_id,
    'email', lower(trim(p_email)),
    'full_name', trim(p_full_name),
    'role', p_role,
    'shop_id', current_shop_id
  );

end;
$$;


/* =========================================================
   2. Restrict execution
   ========================================================= */

/*
 * Nobody should execute this function anonymously.
 */

revoke execute
on function public.create_shop_user(
  text,
  text,
  text
)
from public;


/*
 * Authenticated users can invoke it.
 *
 * The function itself performs the ADMIN check.
 */

grant execute
on function public.create_shop_user(
  text,
  text,
  text
)
to authenticated;