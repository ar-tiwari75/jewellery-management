import { supabase } from "../../lib/supabase";

export interface DashboardMetrics {
  customerCount: number;
  todaySales: number;
  monthlyRevenue: number;
  inventoryValue: number;
}

function getLocalDateString(
  date: Date,
): string {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      date.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = new Date();

  const todayDate =
    getLocalDateString(today);

  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );

  const monthStartDate =
    getLocalDateString(monthStart);

  /*
   * 1. Total registered customers
   */
  const {
    count: customerCount,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id", {
      count: "exact",
      head: true,
    });

  if (customerError) {
    console.error(
      "Failed to load customer count:",
      customerError,
    );

    throw new Error(
      "Unable to load customer count.",
    );
  }

  /*
   * 2. Today's sales
   *
   * Only FINAL invoices are counted.
   * DRAFT and CANCELLED invoices are excluded.
   */
  const {
    data: todayInvoices,
    error: todaySalesError,
  } = await supabase
    .from("invoices")
    .select("grand_total")
    .eq("invoice_date", todayDate)
    .eq("status", "FINAL");

  if (todaySalesError) {
    console.error(
      "Failed to load today's sales:",
      todaySalesError,
    );

    throw new Error(
      "Unable to load today's sales.",
    );
  }

  const todaySales =
    (todayInvoices ?? []).reduce(
      (total, invoice) =>
        total +
        Number(invoice.grand_total ?? 0),
      0,
    );

  /*
   * 3. Current month's revenue
   *
   * Includes FINAL invoices from the
   * first day of the current month onwards.
   */
  const {
    data: monthlyInvoices,
    error: monthlyRevenueError,
  } = await supabase
    .from("invoices")
    .select(
      "grand_total, invoice_date",
    )
    .gte(
      "invoice_date",
      monthStartDate,
    )
    .lte(
      "invoice_date",
      todayDate,
    )
    .eq("status", "FINAL");

  if (monthlyRevenueError) {
    console.error(
      "Failed to load monthly revenue:",
      monthlyRevenueError,
    );

    throw new Error(
      "Unable to load monthly revenue.",
    );
  }

  const monthlyRevenue =
    (monthlyInvoices ?? []).reduce(
      (total, invoice) =>
        total +
        Number(invoice.grand_total ?? 0),
      0,
    );

  /*
   * Inventory will be connected when the
   * inventory table/module is implemented.
   */
  const inventoryValue = 0;

  return {
    customerCount:
      customerCount ?? 0,

    todaySales,

    monthlyRevenue,

    inventoryValue,
  };
}