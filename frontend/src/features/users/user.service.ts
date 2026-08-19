import { supabase } from "../../lib/supabase";

export type ShopUserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface ShopUser {
  id: string;
  full_name: string;
  role: ShopUserRole;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
}

export interface CreateShopUserInput {
  fullName: string;
  email: string;
  role: "MANAGER" | "STAFF";
}

export async function getShopUsers(): Promise<ShopUser[]> {
  const { data, error } = await supabase.rpc("get_shop_users");

  if (error) {
    throw error;
  }

  return (data ?? []) as ShopUser[];
}

export async function createShopUser(
  input: CreateShopUserInput,
): Promise<ShopUser> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  const { data, error } = await supabase.functions.invoke("create-shop-user", {
    body: { email, fullName, role: input.role },
  });

  if (error) {
    if ("context" in error && error.context) {
      try {
        const body = await (error.context as Response).json();
        if (body && typeof body.error === "string") {
          throw new Error(body.error);
        }
        if (body && typeof body.message === "string") {
          throw new Error(body.message);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message !== error.message &&
          err.message !== "Edge Function returned a non-2xx status code"
        ) {
          throw err;
        }
      }
    }
    throw error;
  }

  return data as ShopUser;
}
