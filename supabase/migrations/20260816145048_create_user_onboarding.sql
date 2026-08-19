/*
 * =========================================================
 * User onboarding
 * =========================================================
 *
 * There are two onboarding paths:
 *
 * 1. SHOP OWNER
 *    Supabase Auth signup
 *      -> create shop
 *      -> create ADMIN profile
 *
 * 2. ADMIN CREATED USER
 *    ADMIN creates MANAGER / STAFF
 *      -> existing shop
 *      -> create MANAGER / STAFF profile
 *
 * The onboarding type is determined from
 * raw_user_meta_data.
 *
 * =========================================================
 */


/* =========================================================
   1. Onboarding function
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

  onboarding_type text;

  existing_shop_id uuid;
  requested_role text;
begin

  /*
   * -------------------------------------------------------
   * Read common signup metadata
   * -------------------------------------------------------
   */

  new_full_name :=
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        ''
      )
    );

  onboarding_type :=
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'onboarding_type',
        'OWNER'
      )
    );


  /*
   * =======================================================
   * SHOP OWNER ONBOARDING
   * =======================================================
   */

  if onboarding_type = 'OWNER' then

    /*
     * Read shop name.
     */

    new_shop_name :=
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'shop_name',
          ''
        )
      );


    /*
     * Validate required data.
     */

    if new_shop_name = '' then
      raise exception
        'Shop name is required during signup.';
    end if;

    if new_full_name = '' then
      raise exception
        'Full name is required during signup.';
    end if;


    /*
     * Create the new shop.
     *
     * Shop names are intentionally NOT unique.
     *
     * Tenant identity is the shop UUID.
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

  end if;


  /*
   * =======================================================
   * ADMIN CREATED USER
   * =======================================================
   */

  if onboarding_type = 'SHOP_USER' then

    /*
     * Read the shop and requested role from metadata.
     */

    existing_shop_id :=
      nullif(
        trim(
          coalesce(
            new.raw_user_meta_data ->> 'shop_id',
            ''
          )
        ),
        ''
      )::uuid;


    requested_role :=
      (
        new.raw_user_meta_data ->> 'role'
      );


    /*
     * Validate employee onboarding data.
     */

    if existing_shop_id is null then
      raise exception
        'Shop is required when creating a shop user.';
    end if;

    if new_full_name = '' then
      raise exception
        'Full name is required when creating a shop user.';
    end if;

    if requested_role is null then
      raise exception
        'User role is required when creating a shop user.';
    end if;


    /*
     * Only MANAGER and STAFF may be created
     * through the employee onboarding flow.
     *
     * ADMIN accounts are created only through
     * shop-owner onboarding.
     */

    if requested_role not in (
      'MANAGER',
      'STAFF'
    ) then
      raise exception
        'Only MANAGER or STAFF users can be created.';
    end if;


    /*
     * Verify that the supplied shop exists.
     */

    if not exists (
      select 1
      from public.shops
      where id = existing_shop_id
    ) then
      raise exception
        'The selected shop does not exist.';
    end if;


    /*
     * Create the employee profile.
     *
     * The shop_id comes from trusted metadata generated
     * by the ADMIN-side creation function.
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
      requested_role,
      existing_shop_id
    );


    return new;

  end if;


  /*
   * =======================================================
   * INVALID ONBOARDING TYPE
   * =======================================================
   */

  raise exception
    'Invalid user onboarding type.';


end;
$$;


/* =========================================================
   2. Recreate auth trigger
   ========================================================= */

drop trigger if exists
  on_auth_user_created
on auth.users;


create trigger
  on_auth_user_created
after insert
on auth.users
for each row
execute function public.handle_new_user();