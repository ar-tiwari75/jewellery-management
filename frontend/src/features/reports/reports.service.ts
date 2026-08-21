import { supabase } from "../../lib/supabase";

/* ---------- helpers ---------- */

function localDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ---------- shared ---------- */

async function getShopId(): Promise<string> {
  const {
    data: { user },
    error: ue,
  } = await supabase.auth.getUser();

  if (ue || !user) throw new Error("Not logged in.");

  const { data: p, error: pe } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", user.id)
    .single();

  if (pe || !p?.shop_id) throw new Error("No shop.");
  return p.shop_id;
}

/* ---------- types ---------- */

export interface DailySales {
  date: string;
  revenue: number;
  invoices: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  invoices: number;
}

export interface MetalSplit {
  metal: string;
  revenue: number;
}

export interface TopCustomer {
  name: string;
  revenue: number;
  invoices: number;
}

export interface StaffPerf {
  name: string;
  revenue: number;
  invoices: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalInvoices: number;
  avgInvoiceValue: number;
  totalCustomers: number;
  totalGst: number;
  totalDiscount: number;
}

/* ---------- queries ---------- */

export async function getReportSummary(): Promise<ReportSummary> {
  const shopId = await getShopId();
  const sixMonthsAgo = localDate(monthsAgo(6));

  const { data: inv } = await supabase
    .from("invoices")
    .select("grand_total, gst, discount")
    .eq("shop_id", shopId)
    .eq("status", "FINAL")
    .gte("invoice_date", sixMonthsAgo);

  const { count: custCount } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  const invoices = inv ?? [];
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);
  const totalGst = invoices.reduce((s, i) => s + Number(i.gst ?? 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + Number(i.discount ?? 0), 0);

  return {
    totalRevenue,
    totalInvoices: invoices.length,
    avgInvoiceValue: invoices.length ? totalRevenue / invoices.length : 0,
    totalCustomers: custCount ?? 0,
    totalGst,
    totalDiscount,
  };
}

export async function getDailySales(days = 30): Promise<DailySales[]> {
  const shopId = await getShopId();
  const since = localDate(new Date(Date.now() - days * 86400000));

  const { data } = await supabase
    .from("invoices")
    .select("invoice_date, grand_total")
    .eq("shop_id", shopId)
    .eq("status", "FINAL")
    .gte("invoice_date", since)
    .order("invoice_date");

  const map = new Map<string, DailySales>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = localDate(d);
    map.set(key, { date: key.slice(5), revenue: 0, invoices: 0 });
  }

  for (const row of data ?? []) {
    const key = row.invoice_date;
    const entry = map.get(key) ?? { date: key.slice(5), revenue: 0, invoices: 0 };
    entry.revenue += Number(row.grand_total ?? 0);
    entry.invoices += 1;
    map.set(key, entry);
  }

  return Array.from(map.values());
}

export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenue[]> {
  const shopId = await getShopId();
  const since = localDate(monthsAgo(months));

  const { data } = await supabase
    .from("invoices")
    .select("invoice_date, grand_total")
    .eq("shop_id", shopId)
    .eq("status", "FINAL")
    .gte("invoice_date", since)
    .order("invoice_date");

  const map = new Map<string, MonthlyRevenue>();

  for (let i = months - 1; i >= 0; i--) {
    const d = monthsAgo(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { month: key, revenue: 0, invoices: 0 });
  }

  for (const row of data ?? []) {
    const key = row.invoice_date.slice(0, 7);
    const entry = map.get(key) ?? { month: key, revenue: 0, invoices: 0 };
    entry.revenue += Number(row.grand_total ?? 0);
    entry.invoices += 1;
    map.set(key, entry);
  }

  return Array.from(map.values());
}

export async function getMetalSplit(): Promise<MetalSplit[]> {
  const shopId = await getShopId();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("shop_id", shopId)
    .eq("status", "FINAL");

  const invoiceIds = (invoices ?? []).map((i) => i.id);
  if (!invoiceIds.length) return [];

  const { data: items } = await supabase
    .from("invoice_items")
    .select("metal_type, taxable_amount")
    .in("invoice_id", invoiceIds);

  const map = new Map<string, number>();

  for (const item of items ?? []) {
    const metal = item.metal_type ?? "OTHER";
    map.set(metal, (map.get(metal) ?? 0) + Number(item.taxable_amount ?? 0));
  }

  return Array.from(map.entries()).map(([metal, revenue]) => ({
    metal,
    revenue,
  }));
}

export async function getTopCustomers(limit = 10): Promise<TopCustomer[]> {
  const shopId = await getShopId();

  const { data } = await supabase
    .from("invoices")
    .select("customer_id, grand_total, customers(full_name)")
    .eq("shop_id", shopId)
    .eq("status", "FINAL");

  const map = new Map<string, TopCustomer>();

  for (const row of data ?? []) {
    const name = (row.customers as { full_name?: string } | null)?.full_name ?? "Unknown";
    const existing = map.get(name) ?? { name, revenue: 0, invoices: 0 };
    existing.revenue += Number(row.grand_total ?? 0);
    existing.invoices += 1;
    map.set(name, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getStaffPerformance(): Promise<StaffPerf[]> {
  const shopId = await getShopId();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("created_by, grand_total, profiles(full_name)")
    .eq("shop_id", shopId)
    .eq("status", "FINAL");

  const map = new Map<string, StaffPerf>();

  for (const row of invoices ?? []) {
    const name = (row.profiles as { full_name?: string } | null)?.full_name ?? "Unknown";
    const existing = map.get(name) ?? { name, revenue: 0, invoices: 0 };
    existing.revenue += Number(row.grand_total ?? 0);
    existing.invoices += 1;
    map.set(name, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function getMonthlyGst(months = 12): Promise<{ month: string; gst: number }[]> {
  const shopId = await getShopId();
  const since = localDate(monthsAgo(months));

  const { data } = await supabase
    .from("invoices")
    .select("invoice_date, gst")
    .eq("shop_id", shopId)
    .eq("status", "FINAL")
    .gte("invoice_date", since)
    .order("invoice_date");

  const map = new Map<string, { month: string; gst: number }>();

  for (let i = months - 1; i >= 0; i--) {
    const d = monthsAgo(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { month: key, gst: 0 });
  }

  for (const row of data ?? []) {
    const key = row.invoice_date.slice(0, 7);
    const entry = map.get(key) ?? { month: key, gst: 0 };
    entry.gst += Number(row.gst ?? 0);
    map.set(key, entry);
  }

  return Array.from(map.values());
}
