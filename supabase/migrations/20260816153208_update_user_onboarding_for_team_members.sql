/*
 * =========================================================
 * Update user onboarding
 * =========================================================
 *
 * There are now two types of users:
 *
 * 1. SHOP OWNER
 *    - Signs up through the public signup flow.
 *    - Creates a new shop.
 *    - Becomes ADMIN.
 *
 * 2. SHOP MEMBER
 *    - Added by an existing ADMIN.
 *    - Does NOT create a shop.
 *    - Profile is created for the ADMIN's existing shop.
 *
 * The distinction is made by whether shop_name is present
 * during the initial auth signup.
 *
 * IMPORTANT:
 *
 * We do NOT trust shop_id from user metadata.
 *
 * The shop_id for employees is assigned by the trusted
 * Edge Function after verifying the requesting ADMIN.
 */


/* =========================================================
   Replace onboarding function
   ========================================================= */

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
begin

  /*
   * Read signup metadata.
   */

  new_shop_name :=
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'shop_name',
        ''
      )
    );

  new_full_name :=
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        ''
      )
    );


  /*
   * If there is no shop name, this is an invited
   * shop member.
   *
   * The trusted user-management Edge Function will
   * create the profile after verifying the ADMIN
   * and determining the correct shop_id.
   */

  if new_shop_name = '' then
    return new;
  end if;


  /*
   * Public shop-owner signup requires a full name.
   */

  if new_full_name = '' then
    raise exception
      'Full name is required during signup.';
  end if;


  /*
   * Create the new shop.
   */

  insert into public.shops (
    name
  )
  values (
    new_shop_name
  )
  returning id
  into new_shop_id;


  /*
   * Create the first profile.
   *
   * The shop owner becomes ADMIN.
   */

  insert into public.profiles (
    id,
    full_name,
    role,
    shop_id
  )
  values (
    new.id,
    new_full_name,
    'ADMIN',
    new_shop_id
  );


  return new;
end;
$$;