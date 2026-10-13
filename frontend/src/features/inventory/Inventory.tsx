import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
  Edit,
  Trash2,
  X,
  Save,
  Upload,
  Download,
  FileText,
} from "lucide-react";
import {
  listInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventorySummary,
  listStockMovements,
  createStockMovement,
  type ItemWithStock,
  type InventoryItemInput,
  type InventoryCategory,
  type MetalType,
  type MovementType,
  type StockMovement,
} from "./inventory.service";

const CATEGORIES: InventoryCategory[] = ["RING", "NECKLACE", "BANGLE", "CHAIN", "COIN", "OTHER"];
const METAL_TYPES: MetalType[] = ["GOLD", "SILVER"];
const GOLD_PURITIES = ["24K", "23K", "22K", "20K", "18K", "16K", "14K", "10K"];
const SILVER_PURITIES = ["999", "995", "958", "925", "900", "800"];

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

  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<InventoryItemInput[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItem, setEditingItem] = useState<ItemWithStock | null>(null);
  const [itemForm, setItemForm] = useState<InventoryItemInput>({
    sku: "",
    name: "",
    category: "RING",
    metal_type: "GOLD",
    purity: "22K",
    weight_g: 0,
    cost_rate: 0,
    sale_rate: 0,
    min_stock_qty: 0,
    opening_qty: 0,
    location: "",
    is_active: true,
  });
  const [itemFormErrors, setItemFormErrors] = useState<Partial<Record<keyof InventoryItemInput, string>>>({});
  const [itemFormSaving, setItemFormSaving] = useState(false);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<ItemWithStock | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [movementsCursor, setMovementsCursor] = useState<string | undefined>();
  const [hasMoreMovements, setHasMoreMovements] = useState(false);
  const [movementForm, setMovementForm] = useState({
    type: "IN" as MovementType,
    qty: 1,
    unit_weight_g: 0,
    unit_cost_rate: 0,
    notes: "",
  });
  const [movementError, setMovementError] = useState<string | null>(null);
  const [movementSaving, setMovementSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const s = await getInventorySummary();
      setSummary(s);
    } catch (e) {
      console.error("Failed to load summary:", e);
    }
  }, []);

  const downloadTemplate = useCallback(() => {
    const headers = [
      "sku",
      "name",
      "category",
      "metal_type",
      "purity",
      "weight_g",
      "cost_rate",
      "sale_rate",
      "min_stock_qty",
      "opening_qty",
      "location",
      "is_active",
    ];

    const rows = [
      headers.join(","),
      [
        "GR-22K-001",
        "Gold Ring 22K Plain",
        "RING",
        "GOLD",
        "22K",
        "5.250",
        "58500.00",
        "64350.00",
        "3",
        "10",
        "SAFE-A",
        "true",
      ].join(","),
      [
        "NB-18K-001",
        "Gold Necklace 18K Diamond",
        "NECKLACE",
        "GOLD",
        "18K",
        "12.500",
        "49500.00",
        "54450.00",
        "2",
        "5",
        "SAFE-A",
        "true",
      ].join(","),
      [
        "SN-999-001",
        "Silver Coin 999 10g",
        "COIN",
        "SILVER",
        "999",
        "10.000",
        "75000.00",
        "82500.00",
        "10",
        "100",
        "SHOWCASE-1",
        "true",
      ].join(","),
    ];

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventory_template.csv";
    link.click();
  }, []);

  const parseCSV = (text: string): InventoryItemInput[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = [
      "sku",
      "name",
      "category",
      "metal_type",
      "purity",
      "weight_g",
      "cost_rate",
      "sale_rate",
    ];

    for (const req of requiredHeaders) {
      if (!headers.includes(req)) {
        throw new Error(`Missing required column: ${req}`);
      }
    }

    const results: InventoryItemInput[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = values[idx] ?? ""));

      const metalType = row.metal_type?.toUpperCase();
      const purity = row.purity?.toUpperCase();
      const category = row.category?.toUpperCase();
      const isActive = row.is_active?.toLowerCase() === "true";

      const item: InventoryItemInput = {
        sku: row.sku,
        name: row.name,
        category: category as "RING" | "NECKLACE" | "BANGLE" | "CHAIN" | "COIN" | "OTHER",
        metal_type: metalType as "GOLD" | "SILVER",
        purity,
        weight_g: parseFloat(row.weight_g) || 0,
        cost_rate: parseFloat(row.cost_rate) || 0,
        sale_rate: parseFloat(row.sale_rate) || 0,
        min_stock_qty: parseInt(row.min_stock_qty ?? "0", 10) || 0,
        opening_qty:
          row.opening_qty === undefined || row.opening_qty.trim() === ""
            ? 0
            : Number(row.opening_qty),
        location: row.location || undefined,
        is_active: isActive,
      };

      results.push(item);
    }
    return results;
  };

  const validateItems = (items: InventoryItemInput[]): string[] => {
    const errors: string[] = [];
    const seenSkus = new Set<string>();

    items.forEach((item, idx) => {
      const rowNum = idx + 2;
      if (!item.sku?.trim()) errors.push(`Row ${rowNum}: SKU is required`);
      if (!item.name?.trim()) errors.push(`Row ${rowNum}: Name is required`);
      if (!["RING", "NECKLACE", "BANGLE", "CHAIN", "COIN", "OTHER"].includes(item.category))
        errors.push(`Row ${rowNum}: Invalid category "${item.category}"`);
      if (!["GOLD", "SILVER"].includes(item.metal_type))
        errors.push(`Row ${rowNum}: Invalid metal_type "${item.metal_type}"`);
      if (item.metal_type === "GOLD" && !["24K", "23K", "22K", "20K", "18K", "16K", "14K", "10K"].includes(item.purity))
        errors.push(`Row ${rowNum}: Invalid gold purity "${item.purity}"`);
      if (item.metal_type === "SILVER" && !["999", "995", "958", "925", "900", "800"].includes(item.purity))
        errors.push(`Row ${rowNum}: Invalid silver purity "${item.purity}"`);
      if (item.weight_g <= 0) errors.push(`Row ${rowNum}: Weight must be > 0`);
      if (item.cost_rate <= 0) errors.push(`Row ${rowNum}: Cost rate must be > 0`);
      if (item.sale_rate <= 0) errors.push(`Row ${rowNum}: Sale rate must be > 0`);
      if (item.sale_rate < item.cost_rate) errors.push(`Row ${rowNum}: Sale rate should be >= cost rate`);
      if (
        item.opening_qty === undefined ||
        !Number.isInteger(item.opening_qty) ||
        item.opening_qty < 0
      ) {
        errors.push(`Row ${rowNum}: Opening quantity must be a whole number of 0 or more`);
      }
      if (seenSkus.has(item.sku)) errors.push(`Row ${rowNum}: Duplicate SKU "${item.sku}"`);
      seenSkus.add(item.sku);
    });
    return errors;
  };

  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setImportErrors([]);
    setImportPreview([]);
    setImportSuccess(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        const errors = validateItems(parsed);
        if (errors.length > 0) {
          setImportErrors(errors);
        } else {
          setImportPreview(parsed);
        }
      } catch (e) {
        setImportErrors([e instanceof Error ? e.message : "Failed to parse CSV"]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importPreview.length) return;
    setImportLoading(true);
    setImportSuccess(0);
    setImportErrors([]);

    try {
      for (const item of importPreview) {
        await createInventoryItem(item);
        setImportSuccess((prev) => prev + 1);
      }
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      loadItems(true);
      loadSummary();
    } catch (e) {
      setImportErrors([e instanceof Error ? e.message : "Import failed"]);
    } finally {
      setImportLoading(false);
    }
  };

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

  const loadItemMovements = async (itemId: string, reset = false, cursor?: string) => {
    try {
      setMovementsLoading(true);
      setMovementsError(null);

      const result = await listStockMovements({
        item_id: itemId,
        limit: 20,
        cursor: reset ? undefined : cursor,
      });

      if (reset) {
        setMovements(result.movements);
      } else {
        setMovements((previous) => [...previous, ...result.movements]);
      }

      setMovementsCursor(result.next_cursor);
      setHasMoreMovements(!!result.next_cursor);
    } catch (e) {
      setMovementsError(e instanceof Error ? e.message : "Failed to load movements");
    } finally {
      setMovementsLoading(false);
    }
  };

  const openMovements = async (item: ItemWithStock) => {
    setMovementItem(item);
    setMovementForm({
      type: "IN",
      qty: 1,
      unit_weight_g: item.weight_g,
      unit_cost_rate: item.cost_rate,
      notes: "",
    });
    setMovementError(null);
    setMovements([]);
    setMovementsCursor(undefined);
    setHasMoreMovements(false);
    setMovementModalOpen(true);
    await loadItemMovements(item.id, true);
  };

  const closeMovements = () => {
    setMovementModalOpen(false);
    setMovementItem(null);
    setMovements([]);
    setMovementsCursor(undefined);
    setHasMoreMovements(false);
    setMovementError(null);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementItem) return;

    setMovementError(null);

    const enteredQty = Number(movementForm.qty);
    if (!Number.isInteger(enteredQty) || enteredQty === 0) {
      setMovementError("Quantity must be a whole number other than zero.");
      return;
    }

    if ((movementForm.type === "IN" || movementForm.type === "OUT") && enteredQty < 0) {
      setMovementError("Use a positive quantity for IN and OUT movements.");
      return;
    }

    const signedQty =
      movementForm.type === "OUT"
        ? -Math.abs(enteredQty)
        : movementForm.type === "IN"
          ? Math.abs(enteredQty)
          : enteredQty;

    const unitWeight = Number(movementForm.unit_weight_g);
    if (!Number.isFinite(unitWeight) || unitWeight <= 0) {
      setMovementError("Unit weight must be greater than zero.");
      return;
    }

    const unitCost = Number(movementForm.unit_cost_rate);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setMovementError("Unit cost cannot be negative.");
      return;
    }

    if (movementForm.type === "OUT" && Math.abs(signedQty) > movementItem.current_qty) {
      setMovementError(`Only ${movementItem.current_qty} unit(s) are available.`);
      return;
    }

    try {
      setMovementSaving(true);

      await createStockMovement({
        item_id: movementItem.id,
        type: movementForm.type,
        qty: signedQty,
        unit_weight_g: unitWeight,
        unit_cost_rate: unitCost,
        ref_type: "MANUAL",
        notes: movementForm.notes.trim() || undefined,
      });

      const refreshedItem = await getInventoryItem(movementItem.id);
      if (refreshedItem) {
        setMovementItem(refreshedItem);
      }

      setMovementForm((previous) => ({ ...previous, qty: 1, notes: "" }));
      await loadItemMovements(movementItem.id, true);
      loadItems(true);
      loadSummary();
    } catch (error) {
      setMovementError(error instanceof Error ? error.message : "Failed to save movement");
    } finally {
      setMovementSaving(false);
    }
  };

  const getPurityOptions = (metal: MetalType) =>
    metal === "GOLD" ? GOLD_PURITIES : SILVER_PURITIES;

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemFormErrors({});

    const errors: Partial<Record<keyof InventoryItemInput, string>> = {};
    if (!itemForm.sku.trim()) errors.sku = "SKU is required";
    if (!itemForm.name.trim()) errors.name = "Name is required";
    if (itemForm.weight_g <= 0) errors.weight_g = "Weight must be > 0";
    if (itemForm.cost_rate <= 0) errors.cost_rate = "Cost rate must be > 0";

    // sale_rate is optional (auto 10% markup from cost_rate if 0 or not provided)
    if (itemForm.sale_rate !== 0 && itemForm.sale_rate < itemForm.cost_rate) {
      errors.sale_rate = "Sale rate should be >= cost rate";
    }

    if (!editingItem) {
      const openingQty = itemForm.opening_qty ?? 0;
      if (!Number.isInteger(openingQty) || openingQty < 0) {
        errors.opening_qty = "Opening quantity must be a whole number of 0 or more";
      }
    }

    if (Object.keys(errors).length) {
      setItemFormErrors(errors);
      return;
    }

    try {
      setItemFormSaving(true);
      if (editingItem) {
        await updateInventoryItem(editingItem.id, itemForm);
      } else {
        await createInventoryItem(itemForm);
      }
      setModalOpen(false);
      loadItems(true);
      loadSummary();
    } catch (e) {
      setItemFormErrors({ sku: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setItemFormSaving(false);
    }
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({
      sku: "",
      name: "",
      category: "RING",
      metal_type: "GOLD",
      purity: "22K",
      weight_g: 0,
      cost_rate: 0,
      sale_rate: 0,
      min_stock_qty: 0,
      opening_qty: 0,
      location: "",
      is_active: true,
    });
    setItemFormErrors({});
    setModalOpen(true);
  };

  const openEditItem = async (item: ItemWithStock) => {
    const full = await getInventoryItem(item.id);
    if (full) {
      setEditingItem(full);
      setItemForm({
        sku: full.sku,
        name: full.name,
        category: full.category,
        metal_type: full.metal_type,
        purity: full.purity,
        weight_g: full.weight_g,
        cost_rate: full.cost_rate,
        sale_rate: full.sale_rate,
        min_stock_qty: full.min_stock_qty,
        opening_qty: 0,
        location: full.location ?? "",
        is_active: full.is_active,
      });
      setItemFormErrors({});
      setModalOpen(true);
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
          <div className="flex items-center gap-3">
            <button onClick={() => setImportModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-[#D4D4D8] px-4 py-2 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA]">
              <Upload size={16} /> Import CSV
            </button>
            <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-[#D4D4D8] px-4 py-2 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA]">
              <Download size={16} /> Template
            </button>
            <button onClick={openAddItem} disabled={itemFormSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:opacity-50">
              <Plus size={16} /> Add Item
            </button>
          </div>
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
                        <button onClick={() => openEditItem(item)} disabled={itemFormSaving} className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5] disabled:opacity-50" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => openMovements(item)} className="rounded-lg p-2 text-[#71717A] hover:bg-[#F4F4F5]" title="Movements">
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

      {/* Item Movements Modal */}
      {movementModalOpen && movementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#18181B]">Stock Movements</h2>
                <p className="mt-1 text-xs text-[#71717A]">
                  {movementItem.sku} • {movementItem.name} • Current stock: {movementItem.current_qty}
                </p>
              </div>
              <button onClick={closeMovements} className="text-[#71717A] hover:text-[#18181B]">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              <form onSubmit={handleMovementSubmit} className="rounded-xl border border-[#E4E4E7] p-4">
                <h3 className="text-sm font-semibold text-[#18181B]">Record Movement</h3>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[#18181B]">Type</label>
                    <select
                      value={movementForm.type}
                      onChange={(e) =>
                        setMovementForm((previous) => ({
                          ...previous,
                          type: e.target.value as MovementType,
                        }))
                      }
                      disabled={movementSaving}
                      className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                    >
                      <option value="IN">IN — receive stock</option>
                      <option value="OUT">OUT — issue/sell stock</option>
                      <option value="ADJ">ADJ — correction</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#18181B]">Quantity</label>
                    <input
                      type="number"
                      step="1"
                      value={movementForm.qty}
                      onChange={(e) =>
                        setMovementForm((previous) => ({ ...previous, qty: Number(e.target.value) }))
                      }
                      disabled={movementSaving}
                      className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-[#71717A]">
                      Use a negative quantity only for downward adjustments.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#18181B]">Unit Weight (g)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={movementForm.unit_weight_g}
                      onChange={(e) =>
                        setMovementForm((previous) => ({
                          ...previous,
                          unit_weight_g: Number(e.target.value),
                        }))
                      }
                      disabled={movementSaving}
                      className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#18181B]">Unit Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={movementForm.unit_cost_rate}
                      onChange={(e) =>
                        setMovementForm((previous) => ({
                          ...previous,
                          unit_cost_rate: Number(e.target.value),
                        }))
                      }
                      disabled={movementSaving}
                      className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-[#18181B]">Notes</label>
                    <input
                      type="text"
                      value={movementForm.notes}
                      onChange={(e) =>
                        setMovementForm((previous) => ({ ...previous, notes: e.target.value }))
                      }
                      placeholder="Purchase receipt, recount correction, return, etc."
                      disabled={movementSaving}
                      className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {movementError && <p className="mt-3 text-sm text-red-600">{movementError}</p>}

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={movementSaving}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:opacity-50"
                  >
                    {movementSaving ? "Saving..." : "Add Movement"}
                  </button>
                </div>
              </form>

              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">History</h3>

                {movementsError && <p className="mt-2 text-sm text-red-600">{movementsError}</p>}

                <div className="mt-3 overflow-x-auto rounded-xl border border-[#E4E4E7]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-left">
                        <th className="px-4 py-3 font-medium text-[#71717A]">Date</th>
                        <th className="px-4 py-3 font-medium text-[#71717A]">Type</th>
                        <th className="px-4 py-3 font-medium text-[#71717A]">Qty</th>
                        <th className="px-4 py-3 font-medium text-[#71717A]">Unit</th>
                        <th className="px-4 py-3 font-medium text-[#71717A]">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.length === 0 && !movementsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-[#71717A]">
                            No movements recorded for this item yet.
                          </td>
                        </tr>
                      ) : (
                        movements.map((movement) => (
                          <tr key={movement.id} className="border-b border-[#E4E4E7] last:border-b-0">
                            <td className="px-4 py-3 text-[#18181B]">
                              {new Date(movement.created_at).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  movement.type === "IN"
                                    ? "default"
                                    : movement.type === "OUT"
                                      ? "out"
                                      : "low"
                                }
                              >
                                {movement.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono text-[#18181B]">
                              {movement.qty > 0 ? `+${movement.qty}` : movement.qty}
                            </td>
                            <td className="px-4 py-3 text-[#71717A]">
                              {movement.unit_weight_g.toFixed(3)} g @ ₹
                              {movement.unit_cost_rate.toLocaleString("en-IN", {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-4 py-3 text-[#71717A]">
                              {[movement.ref_type, movement.notes].filter(Boolean).join(" • ") || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {movementsLoading && (
                  <p className="mt-3 text-sm text-[#71717A]">Loading movements...</p>
                )}

                {hasMoreMovements && (
                  <button
                    onClick={() => loadItemMovements(movementItem.id, false, movementsCursor)}
                    disabled={movementsLoading}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA] disabled:opacity-50"
                  >
                    {movementsLoading ? "Loading..." : "Load More"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#18181B]">
                {editingItem ? "Edit Item" : "Add New Item"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-[#71717A] hover:text-[#18181B]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#18181B]">SKU <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="GR-22K-001"
                    disabled={!!editingItem || itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:bg-[#F4F4F5]"
                  />
                  {itemFormErrors.sku && <p className="mt-1 text-sm text-red-600">{itemFormErrors.sku}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#18181B]">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Gold Ring 22K Plain"
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  />
                  {itemFormErrors.name && <p className="mt-1 text-sm text-red-600">{itemFormErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Category <span className="text-red-500">*</span></label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value as InventoryCategory }))}
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Metal <span className="text-red-500">*</span></label>
                  <select
                    value={itemForm.metal_type}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, metal_type: e.target.value as MetalType }))}
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  >
                    {METAL_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Purity <span className="text-red-500">*</span></label>
                  <select
                    value={itemForm.purity}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, purity: e.target.value }))}
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  >
                    {getPurityOptions(itemForm.metal_type).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Weight (g) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={itemForm.weight_g}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, weight_g: Number(e.target.value) }))}
                    placeholder="5.250"
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  />
                  {itemFormErrors.weight_g && <p className="mt-1 text-sm text-red-600">{itemFormErrors.weight_g}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Cost Rate <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={itemForm.cost_rate}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, cost_rate: Number(e.target.value) }))}
                    placeholder="58500.00"
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-[#71717A]">Per 10g (Gold) / Per kg (Silver)</p>
                  {itemFormErrors.cost_rate && <p className="mt-1 text-sm text-red-600">{itemFormErrors.cost_rate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Sale Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={itemForm.sale_rate}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, sale_rate: Number(e.target.value) }))}
                    placeholder={`Auto: cost × 1.10 = ₹${(itemForm.cost_rate * 1.1).toFixed(2)}`}
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-[#71717A]">Per 10g (Gold) / Per kg (Silver) — auto 10% markup if left blank</p>
                  {itemFormErrors.sale_rate && <p className="mt-1 text-sm text-red-600">{itemFormErrors.sale_rate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Min Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.min_stock_qty}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, min_stock_qty: Number(e.target.value) }))}
                    placeholder="5"
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  />
                </div>

                {!editingItem && (
                  <div>
                    <label className="block text-sm font-medium text-[#18181B]">Opening Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={itemForm.opening_qty ?? 0}
                      onChange={(e) => setItemForm((prev) => ({ ...prev, opening_qty: Number(e.target.value) }))}
                      placeholder="0"
                      disabled={itemFormSaving}
                      className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-[#71717A]">Creates an opening IN movement. Leave 0 for catalog-only.</p>
                    {itemFormErrors.opening_qty && <p className="mt-1 text-sm text-red-600">{itemFormErrors.opening_qty}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#18181B]">Location</label>
                  <input
                    type="text"
                    value={itemForm.location}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="SAFE-A"
                    disabled={itemFormSaving}
                    className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={itemForm.is_active}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    disabled={itemFormSaving}
                    className="rounded border-[#D4D4D8] text-[#B08D57] focus:ring-[#B08D57]"
                  />
                  <label htmlFor="is_active" className="text-sm text-[#18181B] cursor-pointer">Active</label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#E4E4E7] pt-4">
                <button type="button" onClick={() => setModalOpen(false)} disabled={itemFormSaving} className="rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA] disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={itemFormSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:opacity-50">
                  <Save size={16} />
                  {itemFormSaving ? "Saving..." : editingItem ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E4E4E7] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                  <FileText size={20} />
                </div>
                <h2 className="text-lg font-semibold text-[#18181B]">Import Inventory from CSV</h2>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="text-[#71717A] hover:text-[#18181B]">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-[#71717A]">
                <p>Upload a CSV file with inventory data. <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); setImportModalOpen(false); }} className="text-[#B08D57] underline">Download template</a> first to see the required format.</p>
                <p className="mt-1">Required columns: sku, name, category, metal_type, purity, weight_g, cost_rate, sale_rate</p>
                <p className="mt-1">Optional: min_stock_qty, opening_qty, location, is_active</p>
              </div>

              {importErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-medium mb-2">Validation Errors:</p>
                  <ul className="list-disc list-inside space-y-1 max-h-40 overflow-auto">
                    {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}

              {importPreview.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <p className="font-medium">Ready to import <strong>{importPreview.length}</strong> items</p>
                  <p className="mt-1">Click "Import" to create them, or select a new file to replace.</p>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="inline-flex items-center gap-2 rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA] cursor-pointer">
                  <FileText size={16} />
                  {importFile ? `Selected: ${importFile.name}` : "Choose CSV File"}
                </label>
                {importFile && (
                  <button onClick={() => { setImportFile(null); setImportPreview([]); setImportErrors([]); fileInputRef.current && (fileInputRef.current.value = ""); }} className="ml-2 text-sm text-red-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E4E4E7] pt-4">
                <button onClick={() => { setImportModalOpen(false); setImportFile(null); setImportPreview([]); setImportErrors([]); }} disabled={importLoading} className="rounded-lg border border-[#D4D4D8] px-4 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA] disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleImport} disabled={importLoading || !importPreview.length} className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:opacity-50">
                  <Upload size={16} />
                  {importLoading ? `Importing... (${importSuccess}/${importPreview.length})` : "Import"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}