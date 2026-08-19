import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Plus,
  Trash2,
  UserRound,
  Receipt,
  Save,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import {
  getLatestMetalRate,
  type DailyMetalRate,
} from "../dashboard/metalRates.service";

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

const GOLD_PURITIES = ["24K", "22K", "18K"];

const SILVER_PURITIES = ["999"];

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
    if (purity === "24K") {
      return metalRate.gold_24k;
    }

    if (purity === "22K") {
      return metalRate.gold_22k;
    }

    if (purity === "18K") {
      return metalRate.gold_18k;
    }
  }

  if (metalType === "SILVER") {
    return metalRate.silver_999;
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
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [customersLoading, setCustomersLoading] =
    useState(true);

  const [customerId, setCustomerId] =
    useState("");

  const [metalRate, setMetalRate] =
    useState<DailyMetalRate | null>(null);

  const [metalRateLoading, setMetalRateLoading] =
    useState(true);

  const [metalRateError, setMetalRateError] =
    useState<string | null>(null);

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

  const [saveSuccess, setSaveSuccess] =
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
  setSaveSuccess(null);

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

      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {saveSuccess}
        </div>
      )}

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

              <select
                value={customerId}
                onChange={(event) =>
                  setCustomerId(
                    event.target.value,
                  )
                }
                disabled={
                  customersLoading
                }
                className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
              >
                <option value="">
                  {customersLoading
                    ? "Loading customers..."
                    : "Select customer"}
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={
                        customer.id
                      }
                    >
                      {customer.full_name}
                      {customer.phone
                        ? ` — ${customer.phone}`
                        : ""}
                    </option>
                  ),
                )}
              </select>
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4D4D8] px-3 py-2 text-sm font-medium text-[#18181B] hover:bg-[#FAFAFA]"
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
                            className="rounded-lg p-2 text-[#71717A] hover:bg-red-50 hover:text-red-600"
                            title="Remove item"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
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
                            className="mt-2 w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                            className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                            className="mt-2 w-full rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                              className="w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-7 pr-16 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                              className="w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 pr-8 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-7 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-7 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                      className="w-full rounded-lg border border-[#D4D4D8] px-3 py-2.5 pr-8 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
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
                  saving ||
                  calculatedItems.length ===
                    0
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#B08D57] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#9C7B4C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />

                {saving
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