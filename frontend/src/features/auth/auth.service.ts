import { supabase } from "../../lib/supabase";

export interface SignUpInput {
  fullName: string;
  shopName: string;
  email: string;
  password: string;
}

/**
 * Sign in an existing user.
 */
export async function login(
  email: string,
  password: string,
) {
  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Create the first user of a jewellery shop.
 *
 * The user becomes ADMIN of the newly
 * created shop.
 *
 * The actual creation of the shop and
 * profile is handled by the database
 * onboarding trigger/function.
 */
export async function signUp(
  input: SignUpInput,
) {
  const fullName =
    input.fullName.trim();

  const shopName =
    input.shopName.trim();

  const email =
    input.email.trim();

  if (!fullName) {
    throw new Error(
      "Full name is required.",
    );
  }

  if (!shopName) {
    throw new Error(
      "Shop name is required.",
    );
  }

  if (!email) {
    throw new Error(
      "Email is required.",
    );
  }

  if (!input.password) {
    throw new Error(
      "Password is required.",
    );
  }

  if (input.password.length < 6) {
    throw new Error(
      "Password must be at least 6 characters.",
    );
  }

  /*
   * Create the Supabase Auth user.
   *
   * The metadata is passed to the database
   * onboarding function.
   *
   * The database function will use:
   *
   * full_name
   * shop_name
   *
   * to create:
   *
   * shops
   * profiles
   *
   * and assign the user as ADMIN.
   */
  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email,
      password: input.password,

      options: {
        data: {
          full_name: fullName,
          shop_name: shopName,
        },
      },
    });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      "Unable to create user account.",
    );
  }

  return data;
}

/** Send a password recovery link to an existing user. */
export async function requestPasswordReset(
  email: string,
) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    throw new Error(
      "Enter your email address first.",
    );
  }

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${window.location.origin}/set-password`,
      },
    );

  if (error) {
    throw error;
  }
}

/**
 * Sign out the current user.
 */
export async function logout() {
  const {
    error,
  } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

/**
 * Get the current authenticated session.
 */
export async function getSession() {
  const {
    data,
    error,
  } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}
