import { supabase } from "../../lib/supabase";

export interface InvoiceHistoryCustomer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
}

export interface InvoiceHistoryItem {
  id: string;
  shop_id: string;
  invoice_number: string;
  invoice_date: string;

  subtotal: number;
  discount: number;
  gst: number;
  grand_total: number;

  status: "DRAFT" | "FINAL" | "CANCELLED";

  customer: InvoiceHistoryCustomer | null;
}

type SupabaseCustomer =
  | InvoiceHistoryCustomer
  | InvoiceHistoryCustomer[]
  | null;

/**
 * Normalize the customer relationship returned by Supabase.
 *
 * Depending on the generated relationship type,
 * Supabase may return the customer as either:
 *
 * - a single object
 * - an array containing one object
 * - null
 */
function normalizeCustomer(
  customer: SupabaseCustomer,
): InvoiceHistoryCustomer | null {
  if (Array.isArray(customer)) {
    return customer[0] ?? null;
  }

  return customer;
}

/**
 * Fetch all invoices for Invoice History.
 *
 * RLS automatically restricts invoices
 * to the authenticated user's shop.
 */
export async function getInvoices(): Promise<
  InvoiceHistoryItem[]
> {
  const { data, error } =
    await supabase
      .from("invoices")
      .select(
        `
          id,
          shop_id,
          invoice_number,
          invoice_date,
          subtotal,
          discount,
          gst,
          grand_total,
          status,
          created_at,

          customer:customers (
            id,
            customer_code,
            full_name,
            phone
          )
        `,
      )
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Failed to load invoices:",
      error,
    );

    throw new Error(
      "Unable to load invoices.",
    );
  }

  return (data ?? []).map(
    (invoice): InvoiceHistoryItem => ({
      id: invoice.id,
      shop_id: invoice.shop_id,
      invoice_number:
        invoice.invoice_number,
      invoice_date:
        invoice.invoice_date,

      subtotal: invoice.subtotal,
      discount: invoice.discount,
      gst: invoice.gst,
      grand_total:
        invoice.grand_total,

      status:
        invoice.status as InvoiceHistoryItem["status"],

      customer:
        normalizeCustomer(
          invoice.customer as SupabaseCustomer,
        ),
    }),
  );
}

/**
 * Fetch the most recent invoices for Dashboard.
 *
 * RLS automatically restricts invoices
 * to the authenticated user's shop.
 */
export async function getRecentInvoices(
  limit = 5,
): Promise<InvoiceHistoryItem[]> {
  const { data, error } =
    await supabase
      .from("invoices")
      .select(
        `
          id,
          shop_id,
          invoice_number,
          invoice_date,
          subtotal,
          discount,
          gst,
          grand_total,
          status,
          created_at,

          customer:customers (
            id,
            customer_code,
            full_name,
            phone
          )
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

  if (error) {
    console.error(
      "Failed to load recent invoices:",
      error,
    );

    throw new Error(
      "Unable to load recent invoices.",
    );
  }

  return (data ?? []).map(
    (invoice): InvoiceHistoryItem => ({
      id: invoice.id,
      shop_id: invoice.shop_id,
      invoice_number:
        invoice.invoice_number,
      invoice_date:
        invoice.invoice_date,

      subtotal: invoice.subtotal,
      discount: invoice.discount,
      gst: invoice.gst,
      grand_total:
        invoice.grand_total,

      status:
        invoice.status as InvoiceHistoryItem["status"],

      customer:
        normalizeCustomer(
          invoice.customer as SupabaseCustomer,
        ),
    }),
  );
}