/*
 * =========================================================
 * Shop onboarding
 * =========================================================
 *
 * The first user creates a shop and becomes ADMIN.
 *
 * Existing users/profiles are preserved.
 *
 * New shop onboarding is performed through a
 * SECURITY DEFINER database function.
 */


/* =========================================================
   1. Replace the automatic profile trigger
   ========================================================= */

/*
 * We no longer want every new auth user to automatically
 * become STAFF.
 *
 * The existing trigger is therefore removed.
 */

drop trigger if exists on_auth_user_created
on auth.users;


/*
 * Remove the old trigger function.
 *
 * This function previously created a STAFF profile
 * automatically.
 */

drop function if exists public.handle_new_user();


/* =========================================================
   2. Create shop onboarding function
   ========================================================= */

/*
 * Creates:
 *
 *   shops
 *      ↓
 *   profiles
 *      role = ADMIN
 *
 * The function can only be executed by an authenticated
 * user and always uses auth.uid() as the profile owner.
 */

create or replace function public.create_shop_for_current_user(
  p_shop_name text,
  p_gst_number text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_pincode text default null,
  p_phone text default null,
  p_email text default null
)
returns public.shops
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  existing_shop_id uuid;
  new_shop public.shops;
begin

  /*
   * Get the currently authenticated user.
   */

  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be authenticated to create a shop.';
  end if;


  /*
   * Prevent the same user from creating multiple shops.
   */

  select shop_id
  into existing_shop_id
  from public.profiles
  where id = current_user_id;


  if existing_shop_id is not null then
    raise exception 'This user already belongs to a shop.';
  end if;


  /*
   * Validate shop name.
   */

  if nullif(trim(p_shop_name), '') is null then
    raise exception 'Shop name is required.';
  end if;


  /*
   * Create the shop.
   */

  insert into public.shops (
    name,
    gst_number,
    address,
    city,
    state,
    pincode,
    phone,
    email
  )
  values (
    trim(p_shop_name),
    nullif(trim(p_gst_number), ''),
    nullif(trim(p_address), ''),
    nullif(trim(p_city), ''),
    nullif(trim(p_state), ''),
    nullif(trim(p_pincode), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), '')
  )
  returning *
  into new_shop;


  /*
   * Create the profile for the first user.
   *
   * This user is the ADMIN of the new shop.
   */

  insert into public.profiles (
    id,
    full_name,
    role,
    shop_id
  )
  select
    current_user_id,
    coalesce(
      raw_user_meta_data ->> 'full_name',
      'User'
    ),
    'ADMIN',
    new_shop.id
  from auth.users
  where id = current_user_id;


  return new_shop;
end;
$$;


/* =========================================================
   3. Restrict function execution
   ========================================================= */

/*
 * Remove default PUBLIC execution.
 */

revoke execute
on function public.create_shop_for_current_user(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;


/*
 * Authenticated users may execute it.
 */

grant execute
on function public.create_shop_for_current_user(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to authenticated;