import { supabase } from "../../lib/supabase";

export interface InvoiceCustomer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
}

export interface InvoiceItem {
  id: string;
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

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_date: string;

  customer_id: string | null;

  subtotal: number;
  discount: number;
  gst: number;
  grand_total: number;

  status: "DRAFT" | "FINAL" | "CANCELLED";

  created_by: string | null;

  created_at: string;
  updated_at: string;

  customer: InvoiceCustomer | null;
  items: InvoiceItem[];
}

export interface InvoiceShopSettings {
  id: string;

  shop_name: string;
  gstin: string | null;

  address: string | null;
  city: string | null;

  phone: string | null;
  email: string | null;

  logo_url: string | null;
}

export interface InvoiceDocumentData {
  invoice: InvoiceRecord;
  shop: InvoiceShopSettings;
}

export async function getInvoiceDocumentData(
  invoiceId: string,
): Promise<InvoiceDocumentData> {
  const [
    invoiceResult,
    shopResult,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        `
          id,
          invoice_number,
          invoice_date,
          customer_id,
          subtotal,
          discount,
          gst,
          grand_total,
          status,
          created_by,
          created_at,
          updated_at,

          customer:customers (
            id,
            customer_code,
            full_name,
            phone,
            email,
            address,
            city
          ),

          items:invoice_items (
            id,
            item_name,
            metal_type,
            purity,
            weight,
            metal_rate,
            metal_rate_unit,
            metal_value,
            wastage_percent,
            wastage_weight,
            wastage_value,
            making_charge,
            item_discount,
            taxable_amount
          )
        `,
      )
      .eq("id", invoiceId)
      .single(),

    supabase
      .from("shop_settings")
      .select(
        `
          id,
          shop_name,
          gstin,
          address,
          city,
          phone,
          email,
          logo_url
        `,
      )
      .limit(1)
      .maybeSingle(),
  ]);

  if (invoiceResult.error) {
    console.error(
      "Failed to load invoice:",
      invoiceResult.error,
    );

    throw new Error(
      "Unable to load invoice details.",
    );
  }

  if (shopResult.error) {
    console.error(
      "Failed to load shop settings:",
      shopResult.error,
    );

    throw new Error(
      "Unable to load shop settings.",
    );
  }

  if (!shopResult.data) {
    throw new Error(
      "Shop settings have not been configured.",
    );
  }

  return {
    invoice:
      invoiceResult.data as unknown as InvoiceRecord,

    shop:
      shopResult.data as InvoiceShopSettings,
  };
}
