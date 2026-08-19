import { supabase } from "../../lib/supabase";

export interface CreateInvoiceItemInput {
  item_name: string;

  metal_type: "GOLD" | "SILVER";
  purity: string;

  weight: number;

  metal_rate: number;
  metal_rate_unit: "10g" | "1kg";

  metal_value: number;

  wastage_percent: number;
  wastage_weight: number;
  wastage_value: number;

  making_charge: number;

  item_discount: number;

  taxable_amount: number;
}

export interface CreateInvoiceInput {
  customer_id: string | null;

  invoice_date: string;

  subtotal: number;
  discount: number;
  gst: number;
  grand_total: number;

  items: CreateInvoiceItemInput[];
}

export interface CreatedInvoice {
  id: string;
  shop_id: string;
  invoice_number: string;
}

/**
 * Get the shop belonging to the currently
 * authenticated user.
 *
 * The shop is determined from profiles.shop_id.
 */
async function getCurrentShopId(
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
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
 * Create a new invoice for the currently
 * authenticated user's shop.
 *
 * Multi-shop isolation is enforced by:
 *
 * user
 *   ↓
 * profiles.shop_id
 *   ↓
 * invoices.shop_id
 *
 * RLS provides the database-level isolation.
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreatedInvoice> {
  /*
   * Get the authenticated user.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      "You must be logged in to create an invoice.",
    );
  }

  /*
   * Determine the shop belonging to
   * the authenticated user.
   */
  const shopId =
    await getCurrentShopId(user.id);

  /*
   * Generate invoice number within
   * this shop and current year.
   */
  const invoiceNumber =
    await generateInvoiceNumber(
      shopId,
    );

  /*
   * Create the invoice.
   */
  const {
    data: invoice,
    error: invoiceError,
  } = await supabase
    .from("invoices")
    .insert({
      shop_id: shopId,

      invoice_number:
        invoiceNumber,

      customer_id:
        input.customer_id,

      invoice_date:
        input.invoice_date,

      subtotal:
        input.subtotal,

      discount:
        input.discount,

      gst:
        input.gst,

      grand_total:
        input.grand_total,

      status: "FINAL",

      created_by:
        user.id,
    })
    .select(
      "id, shop_id, invoice_number",
    )
    .single();

  if (invoiceError) {
    console.error(
      "Failed to create invoice:",
      {
        code:
          invoiceError.code,

        message:
          invoiceError.message,

        details:
          invoiceError.details,

        hint:
          invoiceError.hint,
      },
    );

    throw new Error(
      invoiceError.message ||
        "Unable to create invoice.",
    );
  }

  /*
   * Prepare invoice items.
   *
   * Invoice items inherit shop isolation
   * through their parent invoice.
   */
  const items =
    input.items.map((item) => ({
      invoice_id:
        invoice.id,

      item_name:
        item.item_name,

      metal_type:
        item.metal_type,

      purity:
        item.purity,

      weight:
        item.weight,

      metal_rate:
        item.metal_rate,

      metal_rate_unit:
        item.metal_rate_unit,

      metal_value:
        item.metal_value,

      wastage_percent:
        item.wastage_percent,

      wastage_weight:
        item.wastage_weight,

      wastage_value:
        item.wastage_value,

      making_charge:
        item.making_charge,

      item_discount:
        item.item_discount,

      taxable_amount:
        item.taxable_amount,
    }));

  /*
   * Create invoice items.
   */
  const {
    error: itemError,
  } = await supabase
    .from("invoice_items")
    .insert(items);

    if (itemError) {
    console.error(
      "Failed to create invoice items:",
      itemError,
    );

    /*
     * If invoice item creation fails,
     * remove the invoice that was just created.
     *
     * RLS allows this because the invoice
     * belongs to the current user's shop.
     */
    const { error: cleanupError } = await supabase
      .from("invoices")
      .delete()
      .eq(
        "id",
        invoice.id,
      );

    if (cleanupError) {
      console.error(
        "Failed to clean up orphaned invoice:",
        cleanupError,
      );
    }

    throw new Error(
      "Unable to create invoice items.",
    );
  }

  return {
    id: invoice.id,

    shop_id:
      invoice.shop_id,

    invoice_number:
      invoice.invoice_number,
  };
}

/**
 * Generate an invoice number within
 * the current shop and current year.
 *
 * Example:
 *
 * Shop A:
 * INV-2026-0001
 * INV-2026-0002
 *
 * Shop B:
 * INV-2026-0001
 * INV-2026-0002
 *
 * Invoice numbers can therefore be
 * reused across different shops.
 */
async function generateInvoiceNumber(
  shopId: string,
  retries = 3,
): Promise<string> {
  const year =
    new Date().getFullYear();

  for (let attempt = 0; attempt < retries; attempt++) {
    const {
      count,
      error,
    } = await supabase
      .from("invoices")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "shop_id",
        shopId,
      )
      .gte(
        "invoice_date",
        `${year}-01-01`,
      )
      .lt(
        "invoice_date",
        `${year + 1}-01-01`,
      );

    if (error) {
      console.error(
        "Failed to generate invoice number:",
        error,
      );

      throw new Error(
        "Unable to generate invoice number.",
      );
    }

    const nextNumber =
      (count ?? 0) + 1;

    const candidate = `INV-${year}-${String(
      nextNumber,
    ).padStart(4, "0")}`;

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("shop_id", shopId)
      .eq("invoice_number", candidate)
      .limit(1);

    if (!existing || existing.length === 0) {
      return candidate;
    }
  }

  throw new Error(
    "Unable to generate a unique invoice number. Please try again.",
  );
}