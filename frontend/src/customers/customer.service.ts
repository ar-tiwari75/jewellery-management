import { supabase } from "../lib/supabase";

export interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  anniversary_date: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  address?: string;
  city?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  anniversary_date?: string;
  address?: string;
  city?: string;
  notes?: string;
}

function cleanOptionalValue(
  value?: string,
): string | null {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select(
      `
        id,
        customer_code,
        full_name,
        phone,
        email,
        date_of_birth,
        anniversary_date,
        address,
        city,
        notes,
        created_at,
        updated_at
      `,
    )
    .order("full_name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Failed to load customers:",
      error,
    );

    throw new Error(
      "Unable to load customers.",
    );
  }

  return data ?? [];
}

async function getUserShopId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error("Unable to determine your shop.");
  }

  return data.shop_id;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  const fullName =
    input.full_name.trim();

  const phone =
    input.phone.trim();

  if (!fullName) {
    throw new Error(
      "Customer name is required.",
    );
  }

  if (!phone) {
    throw new Error(
      "Phone number is required.",
    );
  }

  const shopId =
    await getUserShopId();

  const customerCode =
    await generateCustomerCode(shopId);

  const { data, error } = await supabase
    .from("customers")
    .insert({
      shop_id: shopId,

      customer_code:
        customerCode,

      full_name: fullName,

      phone,

      email:
        cleanOptionalValue(
          input.email,
        ),

      date_of_birth:
        cleanOptionalValue(
          input.date_of_birth,
        ),

      anniversary_date:
        cleanOptionalValue(
          input.anniversary_date,
        ),

      address:
        cleanOptionalValue(
          input.address,
        ),

      city:
        cleanOptionalValue(
          input.city,
        ),

      notes:
        cleanOptionalValue(
          input.notes,
        ),
    })
    .select(
      `
        id,
        customer_code,
        full_name,
        phone,
        email,
        date_of_birth,
        anniversary_date,
        address,
        city,
        notes,
        created_at,
        updated_at
      `,
    )
    .single();

  if (error) {
    console.error(
      "Failed to create customer:",
      error,
    );

    if (error.code === "23505") {
      throw new Error(
        "A customer with this phone number already exists.",
      );
    }

    throw new Error(
      "Unable to create customer.",
    );
  }

  return data;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const fullName =
    input.full_name.trim();

  const phone =
    input.phone.trim();

  if (!fullName) {
    throw new Error(
      "Customer name is required.",
    );
  }

  if (!phone) {
    throw new Error(
      "Phone number is required.",
    );
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      full_name: fullName,

      phone,

      email:
        cleanOptionalValue(
          input.email,
        ),

      date_of_birth:
        cleanOptionalValue(
          input.date_of_birth,
        ),

      anniversary_date:
        cleanOptionalValue(
          input.anniversary_date,
        ),

      address:
        cleanOptionalValue(
          input.address,
        ),

      city:
        cleanOptionalValue(
          input.city,
        ),

      notes:
        cleanOptionalValue(
          input.notes,
        ),

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      `
        id,
        customer_code,
        full_name,
        phone,
        email,
        date_of_birth,
        anniversary_date,
        address,
        city,
        notes,
        created_at,
        updated_at
      `,
    )
    .single();

  if (error) {
    console.error(
      "Failed to update customer:",
      error,
    );

    if (error.code === "23505") {
      throw new Error(
        "A customer with this phone number already exists.",
      );
    }

    throw new Error(
      "Unable to update customer.",
    );
  }

  return data;
}

async function generateCustomerCode(shopId: string): Promise<string> {
  const { count, error } =
    await supabase
      .from("customers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("shop_id", shopId);

  if (error) {
    console.error(
      "Failed to generate customer code:",
      error,
    );

    throw new Error(
      "Unable to generate customer code.",
    );
  }

  const nextNumber =
    (count ?? 0) + 1;

  return `CUS-${String(
    nextNumber,
  ).padStart(4, "0")}`;
}