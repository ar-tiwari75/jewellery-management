import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Lock,
  Plus,
  Search,
  Trash2,
  UserRound,
  Receipt,
  Save,
  X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import {
  getLatestMetalRate,
  type DailyMetalRate,
} from "../dashboard/metalRates.service";

import {
  searchInventoryForBilling,
  type InventorySearchResult,
  createOutMovementsForInvoice,
} from "../inventory/inventory.service";

import {
  calculateBillingItem,
  type MetalRateUnit,
  type MetalType,
} from "./billing.calculator";

import {
  createInvoice,
  type CreateInvoiceInput,
  type CreateInvoiceItemInput,
} from "./billing.service";

import {
  useSubscription,
} from "../../contexts/SubscriptionContext";

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
}

interface BillingItem {
  id: string;

  itemName: string;

  metalType: MetalType;
  purity: string;

  weight: string;

  metalRate: string;
  metalRateUnit: MetalRateUnit;

  wastagePercent: string;

  makingCharge: string;

  discount: string;

  inventoryItemId: string;
}

interface CalculatedItem {
  item: BillingItem;

  metalValue: number;
  wastageWeight: number;
  wastageValue: number;
  makingCharge: number;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gst: number;
  grandTotal: number;
}

const GOLD_PURITIES = ["24K", "23K", "22K", "20K", "18K", "16K", "14K", "10K"];

const SILVER_PURITIES = ["999", "995", "958", "925", "900", "800"];

function createEmptyItem(): BillingItem {
  return {
    id: crypto.randomUUID(),

    itemName: "",

    metalType: "GOLD",
    purity: "22K",

    weight: "",

    metalRate: "",
    metalRateUnit: "10g",

    wastagePercent: "0",

    makingCharge: "0",

    discount: "0",

    inventoryItemId: "",
  };
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getTodayDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultRate(
  metalRate: DailyMetalRate | null,
  metalType: MetalType,
  purity: string,
): number {
  if (!metalRate) {
    return 0;
  }

  if (metalType === "GOLD") {
    const colMap: Record<string, number | null> = {
      "24K": metalRate.gold_24k,
      "23K": metalRate.gold_23k,
      "22K": metalRate.gold_22k,
      "20K": metalRate.gold_20k,
      "18K": metalRate.gold_18k,
      "16K": metalRate.gold_16k,
      "14K": metalRate.gold_14k,
      "10K": metalRate.gold_10k,
    };

    const direct = colMap[purity];
    if (direct != null && direct > 0) return direct;

    const karat = parseInt(purity, 10);
    if (Number.isFinite(karat) && karat > 0 && karat <= 24 && metalRate.gold_24k > 0) {
      return Math.round(metalRate.gold_24k * (karat / 24) * 100) / 100;
    }

    return 0;
  }

  if (metalType === "SILVER") {
    const colMap: Record<string, number | null> = {
      "999": metalRate.silver_999,
      "995": metalRate.silver_995,
      "958": metalRate.silver_958,
      "925": metalRate.silver_925,
      "900": metalRate.silver_900,
      "800": metalRate.silver_800,
    };

    const direct = colMap[purity];
    if (direct != null && direct > 0) return direct;

    const purityNum = parseInt(purity, 10);
    if (Number.isFinite(purityNum) && purityNum > 0 && metalRate.silver_999 > 0) {
      return Math.round(metalRate.silver_999 * (purityNum / 999) * 100) / 100;
    }

    return 0;
  }

  return 0;
}

function getRateUnit(
  metalType: MetalType,
): MetalRateUnit {
  return metalType === "GOLD"
    ? "10g"
    : "1kg";
}

function calculateItem(
  item: BillingItem,
  gstPercent: number,
): CalculatedItem | null {
  const weight = Number(item.weight);
  const metalRate = Number(item.metalRate);
  const wastagePercent = Number(
    item.wastagePercent,
  );
  const makingCharge = Number(
    item.makingCharge,
  );
  const discount = Number(item.discount);

  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isFinite(metalRate) ||
    metalRate <= 0
  ) {
    return null;
  }

  try {
    const result = calculateBillingItem({
      metalType: item.metalType,

      weight,

      metalRate,
      metalRateUnit:
        item.metalRateUnit,

      wastagePercent:
        Number.isFinite(wastagePercent)
          ? wastagePercent
          : 0,

      makingCharge:
        Number.isFinite(makingCharge)
          ? makingCharge
          : 0,

      discount:
        Number.isFinite(discount)
          ? discount
          : 0,

      gstPercent,
    });

    return {
      item,

      metalValue: result.metalValue,
      wastageWeight:
        result.wastageWeight,
      wastageValue:
        result.wastageValue,
      makingCharge:
        result.makingCharge,
      subtotal: result.subtotal,
      discount: result.discount,
      taxableAmount:
        result.taxableAmount,
      gst: result.gst,
      grandTotal:
        result.grandTotal,
    };
  } catch {
    return null;
  }
}

export default function Billing() {
  const { subscription } =
    useSubscription();

  const readOnly =
    subscription?.isExpired ?? false;

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customersLoading, setCustomersLoading] =
    useState(true);

  const [customerId, setCustomerId] =
    useState("");

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [customerDropdownOpen, setCustomerDropdownOpen] =
    useState(false);

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const [metalRate, setMetalRate] =
    useState<DailyMetalRate | null>(null);

  const [metalRateLoading, setMetalRateLoading] =
    useState(true);

  const [metalRateError, setMetalRateError] =
    useState<string | null>(null);

  const [inventorySearch, setInventorySearch] =
    useState<Record<string, string>>({});

  const [inventoryDropdownOpen, setInventoryDropdownOpen] =
    useState<Record<string, boolean>>({});

  const [inventoryResults, setInventoryResults] =
    useState<Record<string, InventorySearchResult[]>>({});

  const [inventoryLoading, setInventoryLoading] =
    useState<Record<string, boolean>>({});

  const inventoryDropdownRef = useRef<HTMLDivElement>(null);

  const [items, setItems] =
    useState<BillingItem[]>([
      createEmptyItem(),
    ]);

  const [gstPercent, setGstPercent] =
    useState("0");

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

    const navigate = useNavigate();

  /*
   * Load customers and current market rates.
   */
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setCustomersLoading(true);
        setMetalRateLoading(true);

        const [
          customersResult,
          rateResult,
        ] = await Promise.all([
          supabase
            .from("customers")
            .select(
              "id, full_name, phone",
            )
            .order("full_name", {
              ascending: true,
            }),

          getLatestMetalRate(),
        ]);

        if (!mounted) {
          return;
        }

        if (customersResult.error) {
          console.error(
            "Failed to load customers:",
            customersResult.error,
          );

          throw new Error(
            "Unable to load customers.",
          );
        }

        setCustomers(
          customersResult.data ?? [],
        );

        setMetalRate(rateResult);
      } catch (error) {
        console.error(
          "Failed to load billing data:",
          error,
        );

        if (mounted) {
          setMetalRateError(
            "Unable to load billing data.",
          );
        }
      } finally {
        if (mounted) {
          setCustomersLoading(false);
          setMetalRateLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Close customer dropdown when clicking outside.
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /*
   * When the first item loads and the market rate
   * is available, populate its rate.
   */
  useEffect(() => {
    if (!metalRate) {
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item, index) => {
        /*
         * Only populate an empty rate.
         * This prevents changing a rate that
         * the owner has already edited.
         */
        if (item.metalRate !== "") {
          return item;
        }

        const rate =
          getDefaultRate(
            metalRate,
            item.metalType,
            item.purity,
          );

        return index === 0
          ? {
              ...item,
              metalRate:
                rate > 0
                  ? String(rate)
                  : "",
            }
          : item;
      }),
    );
  }, [metalRate]);

  const gst = Number(gstPercent);

  const calculatedItems =
    useMemo(() => {
      return items
        .map((item) =>
          calculateItem(
            item,
            Number.isFinite(gst) && gst >= 0
              ? gst
              : 0,
          ),
        )
        .filter(
          (
            item,
          ): item is CalculatedItem =>
            item !== null,
        );
    }, [items, gst]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query),
    );
  }, [customers, customerSearch]);

  const invoiceTotals = useMemo(() => {
    return calculatedItems.reduce(
      (totals, item) => {
        totals.subtotal += item.subtotal;
        totals.discount += item.discount;
        totals.taxableAmount +=
          item.taxableAmount;
        totals.gst += item.gst;
        totals.grandTotal +=
          item.grandTotal;

        return totals;
      },
      {
        subtotal: 0,
        discount: 0,
        taxableAmount: 0,
        gst: 0,
        grandTotal: 0,
      },
    );
  }, [calculatedItems]);

  function updateItem(
    itemId: string,
    updates: Partial<BillingItem>,
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
            }
          : item,
      ),
    );
  }

  function updateMetalType(
    itemId: string,
    metalType: MetalType,
  ) {
    const purity =
      metalType === "GOLD"
        ? "22K"
        : "999";

    const rate =
      getDefaultRate(
        metalRate,
        metalType,
        purity,
      );

    updateItem(itemId, {
      metalType,
      purity,
      metalRateUnit:
        getRateUnit(metalType),
      metalRate:
        rate > 0
          ? String(rate)
          : "",
    });
  }

  function updatePurity(
    itemId: string,
    purity: string,
  ) {
    const item = items.find(
      (currentItem) =>
        currentItem.id === itemId,
    );

    if (!item) {
      return;
    }

    const rate =
      getDefaultRate(
        metalRate,
        item.metalType,
        purity,
      );

    updateItem(itemId, {
      purity,
      metalRate:
        rate > 0
          ? String(rate)
          : item.metalRate,
    });
  }

  async function searchInventory(itemId: string, query: string) {
    setInventorySearch((prev) => ({ ...prev, [itemId]: query }));
    setInventoryLoading((prev) => ({ ...prev, [itemId]: true }));

    if (!query.trim()) {
      setInventoryResults((prev) => ({ ...prev, [itemId]: [] }));
      setInventoryDropdownOpen((prev) => ({ ...prev, [itemId]: true }));
      setInventoryLoading((prev) => ({ ...prev, [itemId]: false }));
      return;
    }

    try {
      const results = await searchInventoryForBilling(query);
      setInventoryResults((prev) => ({ ...prev, [itemId]: results }));
      setInventoryDropdownOpen((prev) => ({ ...prev, [itemId]: true }));
    } catch (error) {
      console.error("Inventory search failed:", error);
      setInventoryResults((prev) => ({ ...prev, [itemId]: [] }));
    } finally {
      setInventoryLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  function selectInventoryItem(itemId: string, inv: InventorySearchResult) {
    const rate = inv.sale_rate > 0 ? String(inv.sale_rate) : "";
    updateItem(itemId, {
      inventoryItemId: inv.id,
      itemName: inv.name,
      metalType: inv.metal_type,
      purity: inv.purity,
      weight: String(inv.weight_g),
      metalRate: rate,
      metalRateUnit: inv.metal_type === "GOLD" ? "10g" : "1kg",
    });
    setInventoryDropdownOpen((prev) => ({ ...prev, [itemId]: false }));
    setInventorySearch((prev) => ({ ...prev, [itemId]: inv.name }));
  }

  function clearInventoryItem(itemId: string) {
    updateItem(itemId, {
      inventoryItemId: "",
    });
    setInventorySearch((prev) => ({ ...prev, [itemId]: "" }));
    setInventoryDropdownOpen((prev) => ({ ...prev, [itemId]: false }));
    setInventoryResults((prev) => ({ ...prev, [itemId]: [] }));
  }

  function addItem() {
    const newItem =
      createEmptyItem();

    if (metalRate) {
      const rate =
        getDefaultRate(
          metalRate,
          newItem.metalType,
          newItem.purity,
        );

      newItem.metalRate =
        rate > 0
          ? String(rate)
          : "";
    }

    setItems((currentItems) => [
      ...currentItems,
      newItem,
    ]);
  }

  function removeItem(
    itemId: string,
  ) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter(
        (item) => item.id !== itemId,
      );
    });
  }

  async function handleSaveInvoice() {
  setSaveError(null);

  if (!customerId) {
    setSaveError(
      "Please select a customer.",
    );
    return;
  }

  if (calculatedItems.length === 0) {
    setSaveError(
      "Add at least one valid item with weight and rate.",
    );
    return;
  }

  if (
    calculatedItems.length !==
    items.length
  ) {
    setSaveError(
      "Please complete all invoice items before saving.",
    );
    return;
  }

  try {
    setSaving(true);

    const invoiceItems: CreateInvoiceItemInput[] =
      calculatedItems.map(
        (calculatedItem) => {
          const item =
            calculatedItem.item;

          return {
            item_name:
              item.itemName.trim() ||
              `${item.metalType} ${item.purity}`,

            metal_type:
              item.metalType,

            purity:
              item.purity,

            weight:
              Number(item.weight),

            metal_rate:
              Number(item.metalRate),

            metal_rate_unit:
              item.metalRateUnit,

            metal_value:
              calculatedItem.metalValue,

            wastage_percent:
              Number(
                item.wastagePercent,
              ),

            wastage_weight:
              calculatedItem.wastageWeight,

            wastage_value:
              calculatedItem.wastageValue,

            making_charge:
              calculatedItem.makingCharge,

            item_discount:
              calculatedItem.discount,

            taxable_amount:
              calculatedItem.taxableAmount,
          };
        },
      );

    const invoiceInput: CreateInvoiceInput =
      {
        customer_id:
          customerId,

        invoice_date:
          getTodayDate(),

        subtotal:
          invoiceTotals.subtotal,

        discount:
          invoiceTotals.discount,

        gst:
          invoiceTotals.gst,

        grand_total:
          invoiceTotals.grandTotal,

        items:
          invoiceItems,
      };

    const invoice =
      await createInvoice(
        invoiceInput,
      );

    console.log(
      "Invoice created successfully:",
      invoice,
    );

    // Auto-create OUT stock movements for linked inventory items
    const outMovementItems = items
      .filter((i) => i.inventoryItemId)
      .map((i) => ({
        inventory_item_id: i.inventoryItemId,
        qty: Number(i.weight) > 0 ? 1 : 0, // Each line item = 1 unit sold
        weight_g: Number(i.weight) || 0,
        cost_rate: Number(i.metalRate) || 0,
      }))
      .filter((i) => i.qty > 0);

    if (outMovementItems.length > 0) {
      await createOutMovementsForInvoice(invoice.id, outMovementItems);
    }

    /*
     * Navigate to the saved invoice preview.
     *
     * The invoice ID returned by createInvoice()
     * is used to load the exact saved invoice
     * from Supabase.
     */
    navigate(
      `/billing/invoice/${invoice.id}`,
    );
  } catch (error) {
    console.error(
      "Failed to save invoice:",
      error,
    );

    setSaveError(
      error instanceof Error
        ? error.message
        : "Unable to save invoice.",
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section>
        <p className="text-sm font-medium text-[#B08D57]">
          Billing
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#18181B]">
          Create New Bill
        </h1>

        <p className="mt-1 text-sm text-[#71717A]">
          Create an invoice and calculate the
          final amount.
        </p>
      </section>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {metalRateError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {metalRateError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main billing form */}
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-xl border border-[#E4E4E7] bg-white">
            <div className="flex items-center gap-3 border-b border-[#E4E4E7] px-5 py-5">
              <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                <UserRound size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-[#18181B]">
                  Customer
                </h2>

                <p className="mt-1 text-xs text-[#71717A]">
                  Select the customer for this
                  invoice.
                </p>
              </div>
            </div>

            <div className="p-5">
              <label className="block text-sm font-medium text-[#18181B]">
                Customer
              </label>

              <div className="relative mt-2" ref={customerDropdownRef}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Search by name or phone..."
                    disabled={customersLoading || readOnly}
                    className="w-full rounded-lg border border-[#D4D4D8] bg-white pl-10 pr-10 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearch("");
                        setCustomerId("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181A]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {customerDropdownOpen && !customersLoading && filteredCustomers.length > 0 && (
                  <div
                    className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#E4E4E7] bg-white shadow-lg"
                    role="listbox"
                  >
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(customer.id);
                          setCustomerSearch(customer.full_name + (customer.phone ? ` — ${customer.phone}` : ""));
                          setCustomerDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2.5 text-sm text-left transition-colors ${
                          customerId === customer.id
                            ? "bg-[#F5EFE6] text-[#B08D57]"
                            : "text-[#18181B] hover:bg-[#FAFAFA]"
                        }`}
                        role="option"
                      >
                        <div className="font-medium">{customer.full_name}</div>
                        {customer.phone && (
                          <div className="text-xs text-[#71717A]">{customer.phone}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {customerDropdownOpen && !customersLoading && filteredCustomers.length === 0 && customers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E4E4E7] bg-white shadow-lg px-3 py-2.5 text-sm text-[#71717A]">
                    No customers match your search.
                  </div>
                )}

                {customersLoading && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E4E4E7] bg-white shadow-lg px-3 py-2.5 text-sm text-[#71717A]">
                    Loading customers...
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="rounded-xl border border-[#E4E4E7] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E4E4E7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                  <Receipt size={18} />
                </div>

                <div>
                  <h2 className="font-semibold text-[#18181B]">
                    Items
                  </h2>

                  <p className="mt-1 text-xs text-[#71717A]">
                    Add the jewellery items included
                    in this bill.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={readOnly}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4D4D8] px-3 py-2 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                Add item
              </button>
            </div>

            <div className="space-y-6 p-5">
              {items.map(
                (item, index) => {
                  const calculated =
                    calculatedItems.find(
                      (entry) =>
                        entry.item.id ===
                        item.id,
                    );

                  const purityOptions =
                    item.metalType ===
                    "GOLD"
                      ? GOLD_PURITIES
                      : SILVER_PURITIES;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#E4E4E7] p-5"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-[#18181B]">
                            Item {index + 1}
                          </h3>

                          {calculated && (
                            <p className="mt-1 text-xs text-[#71717A]">
                              Item total{" "}
                              {formatCurrency(
                                calculated.grandTotal,
                              )}
                            </p>
                          )}
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                item.id,
                              )
                            }
                            disabled={readOnly}
                            className="rounded-lg p-2 text-[#71717A] hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Remove item"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Inventory Item Selector */}
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-[#18181B]">
                            Inventory Item (optional)
                          </label>

                          <div className="relative mt-2" ref={inventoryDropdownRef}>
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
                              <input
                                type="text"
                                value={inventorySearch[item.id] ?? ""}
                                onChange={(e) => searchInventory(item.id, e.target.value)}
                                onFocus={() => searchInventory(item.id, inventorySearch[item.id] ?? "")}
                                placeholder="Search inventory by SKU or name..."
                                disabled={readOnly}
                                className="w-full rounded-lg border border-[#D4D4D8] bg-white pl-10 pr-10 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              {item.inventoryItemId && (
                                <button
                                  type="button"
                                  onClick={() => clearInventoryItem(item.id)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181A]"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>

                            {inventoryLoading[item.id] && (
                              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E4E4E7] bg-white shadow-lg px-3 py-2.5 text-sm text-[#71717A]">
                                Searching inventory...
                              </div>
                            )}

                            {inventoryDropdownOpen[item.id] && !inventoryLoading[item.id] && (inventoryResults[item.id]?.length ?? 0) > 0 && (
                              <div
                                className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[#E4E4E7] bg-white shadow-lg"
                                role="listbox"
                              >
                                {inventoryResults[item.id]?.map((inv) => (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => selectInventoryItem(item.id, inv)}
                                    className="w-full px-3 py-2.5 text-sm text-left transition-colors text-[#18181B] hover:bg-[#FAFAFA]"
                                    role="option"
                                  >
                                    <div className="font-medium">{inv.name}</div>
                                    <div className="text-xs text-[#71717A]">
                                      {inv.sku} • {inv.category} • {inv.metal_type} {inv.purity} • Stock: {inv.current_qty}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {inventoryDropdownOpen[item.id] && !inventoryLoading[item.id] && (inventoryResults[item.id]?.length ?? 0) === 0 && (inventorySearch[item.id] ?? "").trim() && (
                              <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E4E4E7] bg-white shadow-lg px-3 py-2.5 text-sm text-[#71717A]">
                                No inventory items match your search.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Item name */}
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-[#18181B]">
                            Item name
                          </label>

                          <input
                            type="text"
                            value={
                              item.itemName
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                item.id,
                                {
                                  itemName:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            placeholder="e.g. Gold Ring"
                            disabled={readOnly}
                            className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>

                        {/* Metal */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Metal
                          </label>

                          <select
                            value={
                              item.metalType
                            }
                            onChange={(
                              event,
                            ) =>
                              updateMetalType(
                                item.id,
                                event
                                  .target
                                  .value as MetalType,
                              )
                            }
                            disabled={readOnly}
                            className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="GOLD">
                              Gold
                            </option>

                            <option value="SILVER">
                              Silver
                            </option>
                          </select>
                        </div>

                        {/* Purity */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Purity
                          </label>

                          <select
                            value={
                              item.purity
                            }
                            onChange={(
                              event,
                            ) =>
                              updatePurity(
                                item.id,
                                event
                                  .target
                                  .value,
                              )
                            }
                            disabled={readOnly}
                            className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {purityOptions.map(
                              (purity) => (
                                <option
                                  key={
                                    purity
                                  }
                                  value={
                                    purity
                                  }
                                >
                                  {purity}
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Weight
                          </label>

                          <div className="relative mt-2">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={
                                item.weight
                              }
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    weight:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              placeholder="0.000"
                              disabled={readOnly}
                              className="w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A]">
                              g
                            </span>
                          </div>
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Rate
                          </label>

                          <div className="relative mt-2">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717A]">
                              ₹
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.metalRate
                              }
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    metalRate:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              placeholder="0.00"
                              disabled={readOnly}
                              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-7 pr-16 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A]">
                              /{" "}
                              {
                                item.metalRateUnit
                              }
                            </span>
                          </div>

                          {metalRateLoading && (
                            <p className="mt-1 text-xs text-[#71717A]">
                              Loading market rate...
                            </p>
                          )}
                        </div>

                        {/* Wastage */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Wastage
                          </label>

                          <div className="relative mt-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.wastagePercent
                              }
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    wastagePercent:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              max="100"
                              disabled={readOnly}
                              className="w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 pr-8 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                            />

                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A]">
                              %
                            </span>
                          </div>
                        </div>

                        {/* Making */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Making charges
                          </label>

                          <div className="relative mt-2">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717A]">
                              ₹
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.makingCharge
                              }
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    makingCharge:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              disabled={readOnly}
                              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-7 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Item discount */}
                        <div>
                          <label className="block text-sm font-medium text-[#18181B]">
                            Item discount
                          </label>

                          <div className="relative mt-2">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#71717A]">
                              ₹
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                item.discount
                              }
                              onChange={(
                                event,
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    discount:
                                      event
                                        .target
                                        .value,
                                  },
                                )
                              }
                              disabled={readOnly}
                              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-7 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Item calculation */}
                      {calculated && (
                        <div className="mt-5 border-t border-[#E4E4E7] pt-4">
                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div className="flex justify-between">
                              <span className="text-[#71717A]">
                                Metal value
                              </span>

                              <span className="font-medium text-[#18181B]">
                                {formatCurrency(
                                  calculated.metalValue,
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-[#71717A]">
                                Wastage value
                              </span>

                              <span className="font-medium text-[#18181B]">
                                {formatCurrency(
                                  calculated.wastageValue,
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-[#71717A]">
                                Wastage weight
                              </span>

                              <span className="font-medium text-[#18181B]">
                                {calculated.wastageWeight.toFixed(
                                  3,
                                )}{" "}
                                g
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-[#71717A]">
                                Making charges
                              </span>

                              <span className="font-medium text-[#18181B]">
                                {formatCurrency(
                                  calculated.makingCharge,
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </section>
        </div>

        {/* Invoice summary */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-xl border border-[#E4E4E7] bg-white">
            <div className="flex items-center gap-3 border-b border-[#E4E4E7] px-5 py-5">
              <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                <Calculator size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-[#18181B]">
                  Bill Summary
                </h2>

                <p className="mt-1 text-xs text-[#71717A]">
                  Final invoice calculation
                </p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#71717A]">
                  Subtotal
                </span>

                <span className="font-medium text-[#18181B]">
                  {formatCurrency(
                    invoiceTotals.subtotal,
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#71717A]">
                  Discount
                </span>

                <span className="font-medium text-[#18181B]">
                  -{" "}
                  {formatCurrency(
                    invoiceTotals.discount,
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[#71717A]">
                  Taxable amount
                </span>

                <span className="font-medium text-[#18181B]">
                  {formatCurrency(
                    invoiceTotals.taxableAmount,
                  )}
                </span>
              </div>

              <div className="border-t border-[#E4E4E7] pt-4">
                <label className="block text-sm font-medium text-[#18181B]">
                  GST
                </label>

                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={gstPercent}
                      onChange={(event) =>
                        setGstPercent(
                          event.target.value,
                        )
                      }
                      disabled={readOnly}
                      max="100"
                      className="w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 pr-8 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57] disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A]">
                      %
                    </span>
                  </div>

                  <div className="flex min-w-28 items-center justify-end rounded-lg bg-[#FAFAFA] px-3 text-sm font-medium text-[#18181B]">
                    {formatCurrency(
                      invoiceTotals.gst,
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E4E4E7] pt-5">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-medium text-[#71717A]">
                    Grand Total
                  </span>

                  <span className="text-2xl font-semibold tracking-tight text-[#18181B]">
                    {formatCurrency(
                      invoiceTotals.grandTotal,
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={
                  readOnly ||
                  saving ||
                  calculatedItems.length ===
                    0
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#B08D57] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#9C7B4C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {readOnly ? (
                  <Lock size={17} />
                ) : (
                  <Save size={17} />
                )}

                {readOnly
                  ? "Subscription expired"
                  : saving
                    ? "Saving invoice..."
                    : "Save & Generate Bill"}
              </button>

              <p className="text-center text-xs leading-5 text-[#71717A]">
                The rate shown for an item can be
                adjusted before saving the bill.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}