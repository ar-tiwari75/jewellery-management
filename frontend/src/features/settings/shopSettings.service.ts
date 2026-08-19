import { supabase } from "../../lib/supabase";

export interface ShopSettings {
  id: string;
  shop_id: string;

  shop_name: string;
  gstin: string | null;

  address: string | null;
  city: string | null;

  phone: string | null;
  email: string | null;

  logo_url: string | null;

  created_at: string;
  updated_at: string;
}

export interface ShopSettingsInput {
  shop_name: string;

  gstin?: string;
  address?: string;
  city?: string;

  phone?: string;
  email?: string;

  logo_url?: string;
}

function cleanOptionalValue(
  value?: string,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

/**
 * Get the shop belonging to the currently
 * authenticated user.
 */
async function getCurrentShopId(
  userId: string,
): Promise<string> {
  const { data, error } =
    await supabase
      .from("profiles")
      .select("shop_id")
      .eq("id", userId)
      .single();

  if (error || !data?.shop_id) {
    console.error(
      "Failed to determine current shop:",
      error,
    );

    throw new Error(
      "Unable to determine the current shop.",
    );
  }

  return data.shop_id;
}

/**
 * Get settings for the currently
 * authenticated user's shop.
 *
 * RLS also ensures that users can only
 * access settings belonging to their shop.
 */
export async function getShopSettings(): Promise<
  ShopSettings | null
> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be logged in to manage shop settings.",
    );
  }

  const shopId =
    await getCurrentShopId(user.id);

  const { data, error } =
    await supabase
      .from("shop_settings")
      .select(
        `
          id,
          shop_id,
          shop_name,
          gstin,
          address,
          city,
          phone,
          email,
          logo_url,
          created_at,
          updated_at
        `,
      )
      .eq(
        "shop_id",
        shopId,
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Failed to load shop settings:",
      error,
    );

    throw new Error(
      "Unable to load shop settings.",
    );
  }

  return data;
}

/**
 * Save settings for the currently
 * authenticated user's shop.
 *
 * If settings already exist, update them.
 * Otherwise create them.
 */
export async function saveShopSettings(
  input: ShopSettingsInput,
): Promise<ShopSettings> {
  const shopName =
    input.shop_name.trim();

  if (!shopName) {
    throw new Error(
      "Shop name is required.",
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be logged in to manage shop settings.",
    );
  }

  const shopId =
    await getCurrentShopId(user.id);

  const existing =
    await getShopSettings();

  const payload = {
    shop_id: shopId,

    shop_name:
      shopName,

    gstin:
      cleanOptionalValue(
        input.gstin,
      ),

    address:
      cleanOptionalValue(
        input.address,
      ),

    city:
      cleanOptionalValue(
        input.city,
      ),

    phone:
      cleanOptionalValue(
        input.phone,
      ),

    email:
      cleanOptionalValue(
        input.email,
      ),

    logo_url:
      cleanOptionalValue(
        input.logo_url,
      ),

    updated_at:
      new Date().toISOString(),
  };

  /*
   * Update existing settings.
   */
  if (existing) {
    const { data, error } =
      await supabase
        .from("shop_settings")
        .update(payload)
        .eq(
          "id",
          existing.id,
        )
        .eq(
          "shop_id",
          shopId,
        )
        .select(
          `
            id,
            shop_id,
            shop_name,
            gstin,
            address,
            city,
            phone,
            email,
            logo_url,
            created_at,
            updated_at
          `,
        )
        .single();

    if (error) {
      console.error(
        "Failed to update shop settings:",
        error,
      );

      throw new Error(
        "Unable to save shop settings.",
      );
    }

    return data;
  }

  /*
   * Create settings for this shop.
   */
  const { data, error } =
    await supabase
      .from("shop_settings")
      .insert({
        ...payload,

        created_at:
          new Date().toISOString(),
      })
      .select(
        `
          id,
          shop_id,
          shop_name,
          gstin,
          address,
          city,
          phone,
          email,
          logo_url,
          created_at,
          updated_at
        `,
      )
      .single();

  if (error) {
    console.error(
      "Failed to create shop settings:",
      error,
    );

    throw new Error(
      "Unable to save shop settings.",
    );
  }

  return data;
}