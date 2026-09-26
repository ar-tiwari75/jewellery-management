import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
  Edit,
  Trash2,
} from "lucide-react";
import {
  listInventoryItems,
  deleteInventoryItem,
  getInventorySummary,
  type ItemWithStock,
  type InventoryCategory,
  type MetalType,
} from "./inventory.service";

const CATEGORIES: InventoryCategory[] = ["RING", "NECKLACE", "BANGLE", "CHAIN", "COIN", "OTHER"];
const METAL_TYPES: MetalType[] = ["GOLD", "SILVER"];

function formatINR(n: number) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-[#E4E4E7] bg-white ${className}`}>{children}</div>;
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">{icon}</div>
        <div>
          <p className="text-xs text-[#71717A]">{label}</p>
          <p className="text-xl font-bold text-[#18181B]">{value}</p>
          {sub && <p className="text-xs text-[#71717A]">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "low" | "out" }) {
  const base = "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium";
  const variants = {
    default: "bg-[#F5EFE6] text-[#B08D57]",
    low: "bg-amber-100 text-amber-700",
    out: "bg-red-100 text-red-700",
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "all">("all");
  const [metalFilter, setMetalFilter] = useState<MetalType | "all">("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [summary, setSummary] = useState<{
    total_items: number;
    total_stock_qty: number;
    total_stock_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
    by_category: Array<{ category: string; items: number; stock_qty: number; stock_value: number }>;
    by_metal: Array<{ metal_type: string; items: number; stock_qty: number; stock_value: number }>;
  } | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const s = await getInventorySummary();
      setSummary(s);
    } catch (e) {
      console.error("Failed to load summary:", e);
    }
  }, []);

  const loadItems = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      const result = await listInventoryItems({
        search: search || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        metal_type: metalFilter !== "all" ? metalFilter : undefined,
        low_stock_only: lowStockOnly,
        limit: 50,
        cursor: reset ? undefined : nextCursor,
      });
      if (reset) setItems(result.items);
      else setItems((prev) => [...prev, ...result.items]);
      setNextCursor(result.next_cursor);
      setHasMore(!!result.next_cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, metalFilter, lowStockOnly, nextCursor]);

  useEffect(() => {
    loadItems(true);
    loadSummary();
  }, [search, categoryFilter, metalFilter, lowStockOnly]);

  const handleDeleteItem = async (item: ItemWithStock) => {
    if (!confirm(`Delete ${item.name} (${item.sku})?`)) return;
    try {
      await deleteInventoryItem(item.id);
      loadItems(true);
      loadSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const filteredItems = useMemo(() => items, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#71717A]">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Summary Stats */}
      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Package size={18} />} label="Total Items" value={String(summary.total_items)} />
          <StatCard icon={<Package size={18} />} label="Total Stock Qty" value={String(summary.total_stock_qty)} />
          <StatCard icon={<TrendingUp size={18} />} label="Stock Value" value={`₹${formatINR(summary.total_stock_value)}`} />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="Low Stock"
            value={String(summary.low_stock_count)}
            sub={`${summary.out_of_stock_count} out of stock`}
          />
        </section>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or name..."
              className="w-full rounded-lg border border-[#D4D4D8] pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as InventoryCategory | "all")}
            className="rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={metalFilter}
            onChange={(e) => setMetalFilter(e.target.value as MetalType | "all")}
            className="rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
          >
            <option value="all">All Metals</option>
            {METAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm text-[#18181B] cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-[#D4D4D8] text-[#B08D57] focus:ring-[#B08D57]"
            />
            Low stock only
          </label>
        </div>
      </Card>

      {/* Items Table */}
      <Card>
        <div className="flex items-center justify-between border-b border-[#E4E4E7] px-5 py-4">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-[#B08D57]" />
            <h2 className="font-semibold text-[#18181B]">Inventory Items</h2>
          </div>
          <button disabled className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed">
            <Plus size={16} /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-left">
                <th className="px-4 py-3 font-medium text-[#71717A]">SKU</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Name</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Category</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Metal / Purity</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Weight (g)</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Rate / Unit</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Stock</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Value</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Status</th>
                <th className="px-4 py-3 font-medium text-[#71717A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#71717A]">
                    {items.length === 0 ? "No inventory items found." : "No items match your filters."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#E4E4E7] hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 font-mono text-[#18181B]">{item.sku}</td>
                    <td className="px-4 py-3 font-medium text-[#18181B]">{item.name}</td>
                    <td className="px-4 py-3 text-[#71717A]">{item.category}</td>
                    <td className="px-4 py-3 text-[#71717A]">{item.metal_type} {item.purity}</td>
                    <td className="px-4 py-3 text-[#18181B]">{item.weight_g.toFixed(3)}</td>
                    <td className="px-4 py-3 text-[#18181B]">₹{item.cost_rate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/{item.metal_type === "GOLD" ? "10g" : "kg"}</td>
                    <td className="px-4 py-3 font-mono text-[#18181B]">{String(item.current_qty)}</td>
                    <td className="px-4 py-3 text-[#18181B]">₹{formatINR(item.stock_value)}</td>
                    <td className="px-4 py-3">
                      {item.current_qty === 0 ? (
                        <Badge variant="out">Out of Stock</Badge>
                      ) : item.is_low_stock ? (
                        <Badge variant="low">Low Stock</Badge>
                      ) : (
                        <Badge variant="default">In Stock</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5]" title="Edit (coming soon)">
                          <Edit size={16} />
                        </button>
                        <button className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5]" title="Movements (coming soon)">
                          <ArrowUpDown size={16} />
                        </button>
                        <button onClick={() => handleDeleteItem(item)} className="rounded-lg p-2 text-[#71717A] hover:bg-red-50 hover:text-red-600" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="border-t border-[#E4E4E7] px-5 py-4">
            <button
              onClick={() => loadItems(false)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}