import { supabase } from "../../lib/supabase";

function b64encode(str: string): string {
  return btoa(str);
}

function b64decode(str: string): string {
  return atob(str);
}

/* ---------- Types ---------- */

export type InventoryCategory = "RING" | "NECKLACE" | "BANGLE" | "CHAIN" | "COIN" | "OTHER";
export type MetalType = "GOLD" | "SILVER";
export type MovementType = "IN" | "OUT" | "ADJ";

export interface InventoryItem {
  id: string;
  shop_id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  metal_type: MetalType;
  purity: string;
  weight_g: number;
  cost_rate: number;
  sale_rate: number;
  min_stock_qty: number;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventorySearchResult {
  id: string;
  sku: string;
  name: string;
  category: string;
  metal_type: MetalType;
  purity: string;
  weight_g: number;
  sale_rate: number;
  current_qty: number;
}

export interface InventoryItemInput {
  sku: string;
  name: string;
  category: InventoryCategory;
  metal_type: MetalType;
  purity: string;
  weight_g: number;
  cost_rate: number;
  sale_rate: number;
  min_stock_qty?: number;
  location?: string;
  is_active?: boolean;
}

export interface StockMovement {
  id: string;
  shop_id: string;
  item_id: string;
  type: MovementType;
  qty: number;
  unit_weight_g: number;
  unit_cost_rate: number;
  ref_type: string | null;
  ref_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface StockMovementInput {
  item_id: string;
  type: MovementType;
  qty: number;
  unit_weight_g: number;
  unit_cost_rate: number;
  ref_type?: string;
  ref_id?: string;
  notes?: string;
}

export interface ItemWithStock extends InventoryItem {
  current_qty: number;
  stock_value: number;
  last_movement_at: string | null;
  is_low_stock: boolean;
}

export interface InventorySummary {
  total_items: number;
  total_stock_qty: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  by_category: CategorySummary[];
  by_metal: MetalSummary[];
}

export interface CategorySummary {
  category: string;
  items: number;
  stock_qty: number;
  stock_value: number;
}

export interface MetalSummary {
  metal_type: string;
  items: number;
  stock_qty: number;
  stock_value: number;
}

export interface MovementTrend {
  date: string;
  in_qty: number;
  out_qty: number;
  adj_qty: number;
  net_qty: number;
}

export interface TopMovingItem {
  item_id: string;
  sku: string;
  name: string;
  category: string;
  total_out: number;
  total_in: number;
}

/* ---------- Helpers ---------- */

async function getShopId(): Promise<string> {
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw new Error("Not logged in.");
  const { data: p, error: pe } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (pe || !p?.shop_id) throw new Error("No shop.");
  return p.shop_id;
}

/* ---------- CRUD ---------- */

export async function listInventoryItems(params?: {
  category?: InventoryCategory;
  metal_type?: MetalType;
  search?: string;
  low_stock_only?: boolean;
  active_only?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<{ items: ItemWithStock[]; next_cursor?: string }> {
  const shopId = await getShopId();
  const limit = params?.limit ?? 50;

  let query = supabase
    .from("inventory_items")
    .select(`
      *,
      inventory_stock!inner (current_qty, last_movement_at)
    `)
    .eq("shop_id", shopId);

  if (params?.active_only !== false) query = query.eq("is_active", true);
  if (params?.category) query = query.eq("category", params.category);
  if (params?.metal_type) query = query.eq("metal_type", params.metal_type);
  if (params?.search) {
    query = query.or(`sku.ilike.%${params.search}%,name.ilike.%${params.search}%`);
  }

  query = query.order("updated_at", { ascending: false }).limit(limit + 1);

if (params?.cursor) {
      const decoded = b64decode(params.cursor);
      const [updated_at, id] = decoded.split("|");
      query = query.or(`updated_at.lt.${updated_at},and(updated_at.eq.${updated_at},id.lt.${id})`);
    }

  const { data, error } = await query;
  if (error) throw new Error("Failed to load inventory: " + error.message);

  const items = (data ?? []).map((row) => {
    const stock = Array.isArray(row.inventory_stock) ? row.inventory_stock[0] : row.inventory_stock;
    const current_qty = stock?.current_qty ?? 0;
    return {
      ...row,
      current_qty,
      stock_value: current_qty * row.cost_rate,
      last_movement_at: stock?.last_movement_at ?? null,
      is_low_stock: current_qty <= row.min_stock_qty && row.min_stock_qty > 0,
    };
  });

  let next_cursor: string | undefined;
  if (items.length > limit) {
    const last = items[limit - 1];
    next_cursor = b64encode(`${last.updated_at}|${last.id}`);
    items.pop();
  }

  if (params?.low_stock_only) {
    return { items: items.filter((i) => i.is_low_stock), next_cursor };
  }

  return { items, next_cursor };
}

export async function getInventoryItem(id: string): Promise<ItemWithStock | null> {
  const shopId = await getShopId();
  const { data, error } = await supabase
    .from("inventory_items")
    .select(`
      *,
      inventory_stock!inner (current_qty, last_movement_at)
    `)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Failed to load item: " + error.message);
  if (!data) return null;
    const stock = Array.isArray(data.inventory_stock) ? data.inventory_stock[0] : data.inventory_stock;
    const current_qty = stock?.current_qty ?? 0;
    return {
      ...data,
      current_qty,
      stock_value: current_qty * data.cost_rate,
      last_movement_at: stock?.last_movement_at ?? null,
      is_low_stock: current_qty <= data.min_stock_qty && data.min_stock_qty > 0,
    };
}

export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
  const shopId = await getShopId();
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw new Error("Not logged in.");

  const payload = {
    shop_id: shopId,
    ...input,
    min_stock_qty: input.min_stock_qty ?? 0,
    is_active: input.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("inventory_items")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error("Failed to create item: " + error.message);
  return data;
}

export async function updateInventoryItem(id: string, input: Partial<InventoryItemInput>): Promise<InventoryItem> {
  const shopId = await getShopId();
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("shop_id", shopId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error("Failed to update item: " + error.message);
  return data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const shopId = await getShopId();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("shop_id", shopId)
    .eq("id", id);
  if (error) throw new Error("Failed to delete item: " + error.message);
}

/* ---------- Stock Movements ---------- */

export async function createStockMovement(input: StockMovementInput): Promise<StockMovement> {
  const shopId = await getShopId();
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw new Error("Not logged in.");

  const { data: item, error: ie } = await supabase
    .from("inventory_items")
    .select("id, shop_id")
    .eq("id", input.item_id)
    .eq("shop_id", shopId)
    .single();
  if (ie || !item) throw new Error("Item not found in your shop.");

  const payload = {
    shop_id: shopId,
    ...input,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("stock_movements")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error("Failed to create movement: " + error.message);
  return data;
}

export async function listStockMovements(params?: {
  item_id?: string;
  type?: MovementType;
  limit?: number;
  cursor?: string;
}): Promise<{ movements: StockMovement[]; next_cursor?: string }> {
  const shopId = await getShopId();
  const limit = params?.limit ?? 50;

  let query = supabase
    .from("stock_movements")
    .select("*")
    .eq("shop_id", shopId);

  if (params?.item_id) query = query.eq("item_id", params.item_id);
  if (params?.type) query = query.eq("type", params.type);

  query = query.order("created_at", { ascending: false }).limit(limit + 1);

if (params?.cursor) {
      const decoded = b64decode(params.cursor);
      const [created_at, id] = decoded.split("|");
      query = query.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
    }

  const { data, error } = await query;
  if (error) throw new Error("Failed to load movements: " + error.message);

  const movements = (data ?? []).slice(0, limit);
  let next_cursor: string | undefined;
  if (data && data.length > limit) {
    const last = movements[movements.length - 1];
    next_cursor = b64encode(`${last.created_at}|${last.id}`);
  }
  return { movements, next_cursor };
}

/* ---------- Summary & Charts ---------- */

export async function getInventorySummary(): Promise<InventorySummary> {
  const shopId = await getShopId();

  const { data: items, error } = await supabase
    .from("inventory_items")
    .select(`
      id, category, metal_type, cost_rate, min_stock_qty,
      inventory_stock!inner (current_qty)
    `)
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (error) throw new Error("Failed to load summary: " + error.message);

  const enriched = (items ?? []).map((i) => {
    const stock = Array.isArray(i.inventory_stock) ? i.inventory_stock[0] : i.inventory_stock;
    const current_qty = stock?.current_qty ?? 0;
    return {
      ...i,
      current_qty,
      stock_value: current_qty * i.cost_rate,
      is_low_stock: current_qty <= i.min_stock_qty && i.min_stock_qty > 0,
    };
  });

  const total_items = enriched.length;
  const total_stock_qty = enriched.reduce((s, i) => s + i.current_qty, 0);
  const total_stock_value = enriched.reduce((s, i) => s + i.stock_value, 0);
  const low_stock_count = enriched.filter((i) => i.is_low_stock).length;
  const out_of_stock_count = enriched.filter((i) => i.current_qty === 0).length;

  const by_category_map = new Map<string, CategorySummary>();
  for (const i of enriched) {
    const key = i.category;
    const existing = by_category_map.get(key) ?? { category: key, items: 0, stock_qty: 0, stock_value: 0 };
    existing.items += 1;
    existing.stock_qty += i.current_qty;
    existing.stock_value += i.stock_value;
    by_category_map.set(key, existing);
  }

  const by_metal_map = new Map<string, MetalSummary>();
  for (const i of enriched) {
    const key = i.metal_type;
    const existing = by_metal_map.get(key) ?? { metal_type: key, items: 0, stock_qty: 0, stock_value: 0 };
    existing.items += 1;
    existing.stock_qty += i.current_qty;
    existing.stock_value += i.stock_value;
    by_metal_map.set(key, existing);
  }

  return {
    total_items,
    total_stock_qty,
    total_stock_value,
    low_stock_count,
    out_of_stock_count,
    by_category: Array.from(by_category_map.values()).sort((a, b) => b.stock_value - a.stock_value),
    by_metal: Array.from(by_metal_map.values()).sort((a, b) => b.stock_value - a.stock_value),
  };
}

export async function getMovementTrend(days = 30): Promise<MovementTrend[]> {
  const shopId = await getShopId();
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("stock_movements")
    .select("type, qty, created_at")
    .eq("shop_id", shopId)
    .gte("created_at", since)
    .order("created_at");

  if (error) throw new Error("Failed to load trend: " + error.message);

  const map = new Map<string, MovementTrend>();
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000).toISOString().split("T")[0];
    map.set(date, { date: date.slice(5), in_qty: 0, out_qty: 0, adj_qty: 0, net_qty: 0 });
  }

  for (const m of data ?? []) {
    const date = m.created_at.split("T")[0];
    const entry = map.get(date) ?? { date: date.slice(5), in_qty: 0, out_qty: 0, adj_qty: 0, net_qty: 0 };
    if (m.type === "IN") entry.in_qty += m.qty;
    else if (m.type === "OUT") entry.out_qty += m.qty;
    else entry.adj_qty += m.qty;
    entry.net_qty = entry.in_qty - entry.out_qty + entry.adj_qty;
    map.set(date, entry);
  }

  return Array.from(map.values());
}

export async function getTopMovingItems(limit = 10): Promise<TopMovingItem[]> {
  const shopId = await getShopId();

  const { data, error } = await supabase
    .from("stock_movements")
    .select(`
      item_id, type, qty,
      inventory_items!inner (sku, name, category)
    `)
    .eq("shop_id", shopId)
    .in("type", ["IN", "OUT"]);

  if (error) throw new Error("Failed to load top movers: " + error.message);

  const map = new Map<string, TopMovingItem>();
  for (const m of data ?? []) {
    const itemsArr = Array.isArray(m.inventory_items) ? m.inventory_items : [m.inventory_items];
    const item = itemsArr[0] as { sku: string; name: string; category: string };
    const key = m.item_id;
    const existing = map.get(key) ?? {
      item_id: key,
      sku: item.sku,
      name: item.name,
      category: item.category,
      total_out: 0,
      total_in: 0,
    };
    if (m.type === "OUT") existing.total_out += m.qty;
    else existing.total_in += m.qty;
    map.set(key, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_out - a.total_out)
    .slice(0, limit);
}

/* ---------- Auto OUT on Invoice FINAL ---------- */

export async function createOutMovementsForInvoice(
  invoiceId: string,
  items: Array<{
    inventory_item_id: string;
    qty: number;
    weight_g: number;
    cost_rate: number;
  }>
): Promise<void> {
  const shopId = await getShopId();
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw new Error("Not logged in.");

  const movements = items
    .filter((i) => i.inventory_item_id)
    .map((i) => ({
      shop_id: shopId,
      item_id: i.inventory_item_id,
      type: "OUT" as MovementType,
      qty: i.qty,
      unit_weight_g: i.weight_g,
      unit_cost_rate: i.cost_rate,
      ref_type: "INVOICE",
      ref_id: invoiceId,
      notes: `Auto OUT from invoice ${invoiceId}`,
      created_by: user.id,
    }));

  if (!movements.length) return;

  const { error } = await supabase.from("stock_movements").insert(movements);
  if (error) throw new Error("Failed to create OUT movements: " + error.message);
}

export async function reverseOutMovementsForInvoice(invoiceId: string): Promise<void> {
  const shopId = await getShopId();
  const { data: { user }, error: ue } = await supabase.auth.getUser();
  if (ue || !user) throw new Error("Not logged in.");

  const { data: existing, error: fe } = await supabase
    .from("stock_movements")
    .select("id, item_id, qty, unit_weight_g, unit_cost_rate")
    .eq("shop_id", shopId)
    .eq("ref_type", "INVOICE")
    .eq("ref_id", invoiceId)
    .eq("type", "OUT");

  if (fe) throw new Error("Failed to find movements: " + fe.message);
  if (!existing?.length) return;

  const reversals = existing.map((m) => ({
    shop_id: shopId,
    item_id: m.item_id,
    type: "IN" as MovementType,
    qty: m.qty,
    unit_weight_g: m.unit_weight_g,
    unit_cost_rate: m.unit_cost_rate,
    ref_type: "INVOICE_REVERSAL",
    ref_id: invoiceId,
    notes: `Reversal for cancelled/edited invoice ${invoiceId}`,
    created_by: user.id,
  }));

  const { error } = await supabase.from("stock_movements").insert(reversals);
  if (error) throw new Error("Failed to create reversal movements: " + error.message);
}

/* ---------- Search for Billing ---------- */

export async function searchInventoryForBilling(query: string): Promise<Array<{
  id: string;
  sku: string;
  name: string;
  category: string;
  metal_type: MetalType;
  purity: string;
  weight_g: number;
  sale_rate: number;
  current_qty: number;
}>> {
  const shopId = await getShopId();
  const { data, error } = await supabase
    .from("inventory_items")
    .select(`
      id, sku, name, category, metal_type, purity, weight_g, sale_rate,
      inventory_stock!inner (current_qty)
    `)
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .or(`sku.ilike.%${query}%,name.ilike.%${query}%`)
    .order("name")
    .limit(20);

  if (error) throw new Error("Failed to search inventory: " + error.message);

  return (data ?? []).map((row) => {
    const stock = Array.isArray(row.inventory_stock) ? row.inventory_stock[0] : row.inventory_stock;
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      metal_type: row.metal_type,
      purity: row.purity,
      weight_g: row.weight_g,
      sale_rate: row.sale_rate,
      current_qty: stock?.current_qty ?? 0,
    };
  });
}