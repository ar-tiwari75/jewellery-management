import { useEffect, useState } from "react";
import {
  Users,
  IndianRupee,
  Package,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getLatestMetalRate,
  type DailyMetalRate,
} from "./metalRates.service";

import {
  getRecentInvoices,
  type InvoiceHistoryItem,
} from "../billing/invoiceHistory.service";

import {
  getDashboardMetrics,
  type DashboardMetrics,
} from "./dashboard.service";

import {
  getShopSettings,
  type ShopSettings,
} from "../settings/shopSettings.service";

interface MetalRateCardProps {
  label: string;
  value: number;
  unit: string;
}

function MetalRateCard({
  label,
  value,
  unit,
}: MetalRateCardProps) {
  return (
    <div className="p-5">
      <p className="text-sm text-[#71717A]">
        {label}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[#18181B]">
          ₹
          {value.toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </span>

        <span className="text-xs text-[#71717A]">
          {unit}
        </span>
      </div>
    </div>
  );
}

function formatUpdatedTime(
  metalRate: DailyMetalRate,
): string {
  if (!metalRate.fetched_at) {
    return new Date(
      `${metalRate.rate_date}T00:00:00`,
    ).toLocaleDateString("en-IN", {
      dateStyle: "medium",
    });
  }

  return new Date(
    metalRate.fetched_at,
  ).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  if (hour < 21) {
    return "Good evening";
  }

  return "Good night";
}

export default function Dashboard() {
  const navigate = useNavigate();

  /*
   * Metal rates
   */
  const [metalRate, setMetalRate] =
    useState<DailyMetalRate | null>(null);

  const [metalRateLoading, setMetalRateLoading] =
    useState(true);

  const [metalRateError, setMetalRateError] =
    useState<string | null>(null);

  /*
   * Recent invoices
   */
  const [recentInvoices, setRecentInvoices] =
    useState<InvoiceHistoryItem[]>([]);

  const [recentInvoicesLoading, setRecentInvoicesLoading] =
    useState(true);

  const [recentInvoicesError, setRecentInvoicesError] =
    useState<string | null>(null);

  /*
   * Dashboard metrics
   */
  const [dashboardMetrics, setDashboardMetrics] =
    useState<DashboardMetrics | null>(null);

  const [dashboardMetricsLoading, setDashboardMetricsLoading] =
    useState(true);

  const [dashboardMetricsError, setDashboardMetricsError] =
    useState<string | null>(null);

  /*
   * Shop settings
   */
  const [shopSettings, setShopSettings] =
    useState<ShopSettings | null>(null);

  /*
   * Dashboard summary cards
   *
   * This must be inside Dashboard() because
   * it uses dashboardMetrics state.
   */
  const summaryCards = [
    {
      title: "Customers",

      value: dashboardMetricsLoading
        ? "—"
        : dashboardMetricsError
          ? "—"
          : (
              dashboardMetrics?.customerCount ??
              0
            ).toLocaleString("en-IN"),

      description: "Registered customers",

      icon: Users,
    },

    {
      title: "Today's Sales",

      value: dashboardMetricsLoading
        ? "—"
        : dashboardMetricsError
          ? "—"
          : `₹${(
              dashboardMetrics?.todaySales ??
              0
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}`,

      description: dashboardMetricsLoading
        ? "Loading sales"
        : "Finalized sales today",

      icon: IndianRupee,
    },

    {
      title: "Inventory Value",

      value: dashboardMetricsLoading
        ? "—"
        : dashboardMetricsError
          ? "—"
          : `₹${(
              dashboardMetrics?.inventoryValue ??
              0
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}`,

      description: "Current stock value",

      icon: Package,
    },

    {
      title: "Monthly Revenue",

      value: dashboardMetricsLoading
        ? "—"
        : dashboardMetricsError
          ? "—"
          : `₹${(
              dashboardMetrics?.monthlyRevenue ??
              0
            ).toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}`,

      description: dashboardMetricsLoading
        ? "Loading revenue"
        : "Finalized sales this month",

      icon: TrendingUp,
    },
  ];

  /*
   * Load metal rates
   */
  useEffect(() => {
    let mounted = true;

    async function loadMetalRate() {
      try {
        setMetalRateLoading(true);
        setMetalRateError(null);

        const result =
          await getLatestMetalRate();

        if (mounted) {
          setMetalRate(result);
        }
      } catch (error) {
        console.error(
          "Failed to load market rates:",
          error,
        );

        if (mounted) {
          setMetalRateError(
            "Market rates are currently unavailable.",
          );
        }
      } finally {
        if (mounted) {
          setMetalRateLoading(false);
        }
      }
    }

    loadMetalRate();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load recent invoices
   */
  useEffect(() => {
    loadRecentInvoices();
  }, []);

  async function loadRecentInvoices() {
    try {
      setRecentInvoicesLoading(true);
      setRecentInvoicesError(null);

      const invoices =
        await getRecentInvoices(5);

      setRecentInvoices(invoices);
    } catch (error) {
      console.error(
        "Failed to load recent invoices:",
        error,
      );

      setRecentInvoicesError(
        error instanceof Error
          ? error.message
          : "Unable to load recent invoices.",
      );
    } finally {
      setRecentInvoicesLoading(false);
    }
  }

  /*
   * Load Dashboard metrics
   */
  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  /*
   * Load shop settings
   */
  useEffect(() => {
    let mounted = true;

    async function loadShopSettings() {
      try {
        const settings = await getShopSettings();
        if (mounted) {
          setShopSettings(settings);
        }
      } catch {
        // Silent — shop name is non-critical
      }
    }

    loadShopSettings();

    return () => {
      mounted = false;
    };
  }, []);

  async function loadDashboardMetrics() {
    try {
      setDashboardMetricsLoading(true);
      setDashboardMetricsError(null);

      const metrics =
        await getDashboardMetrics();

      setDashboardMetrics(metrics);
    } catch (error) {
      console.error(
        "Failed to load dashboard metrics:",
        error,
      );

      setDashboardMetricsError(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard metrics.",
      );
    } finally {
      setDashboardMetricsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section>
        <div className="inline-flex items-center gap-2.5 rounded-xl border border-[#E4E4E7] bg-white px-4 py-2.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B08D57]">
            <span className="text-sm">&#128142;</span>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
              Your Shop
            </p>

            <p className="text-base font-bold tracking-wide text-[#18181B]">
              {shopSettings?.shop_name || "Shop"}
            </p>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#18181B]">
          {getGreeting()}
        </h2>

        <p className="mt-1 text-sm text-[#71717A]">
          Here's what's happening with your jewellery
          business.
        </p>
      </section>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-xl border border-[#E4E4E7] bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#71717A]">
                    {card.title}
                  </p>

                  <p className="mt-2 text-2xl font-semibold tracking-tight text-[#18181B]">
                    {card.value}
                  </p>
                </div>

                <div className="rounded-lg bg-[#F5EFE6] p-2.5 text-[#B08D57]">
                  <Icon size={19} />
                </div>
              </div>

              <p className="mt-3 text-xs text-[#71717A]">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Metal rates */}
      <section className="rounded-xl border border-[#E4E4E7] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#E4E4E7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-[#18181B]">
              Mumbai Market Rates
            </h3>

            <p className="mt-1 text-xs text-[#71717A]">
              Daily reference rates
            </p>
          </div>

          {metalRate &&
            !metalRateLoading && (
              <span className="text-xs text-[#71717A]">
                Updated{" "}
                {formatUpdatedTime(
                  metalRate,
                )}
              </span>
            )}
        </div>

        {metalRateLoading ? (
          <div className="flex min-h-32 items-center justify-center p-5">
            <p className="text-sm text-[#71717A]">
              Loading market rates...
            </p>
          </div>
        ) : metalRateError ? (
          <div className="flex min-h-32 items-center justify-center p-5">
            <p className="text-sm text-red-600">
              {metalRateError}
            </p>
          </div>
        ) : !metalRate ? (
          <div className="flex min-h-32 items-center justify-center p-5">
            <p className="text-sm text-[#71717A]">
              No market rates available.
            </p>
          </div>
        ) : (
          <div className="grid divide-y divide-[#E4E4E7] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <MetalRateCard
              label="Gold 22K"
              value={
                metalRate.gold_22k
              }
              unit="/ 10g"
            />

            <MetalRateCard
              label="Gold 24K"
              value={
                metalRate.gold_24k
              }
              unit="/ 10g"
            />

            <MetalRateCard
              label="Silver 999"
              value={
                metalRate.silver_999
              }
              unit="/ kg"
            />
          </div>
        )}
      </section>

      {/* Bottom section */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Recent sales */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white xl:col-span-2">
          <div className="flex items-center justify-between border-b border-[#E4E4E7] px-5 py-5">
            <div>
              <h3 className="font-semibold text-[#18181B]">
                Recent Sales
              </h3>

              <p className="mt-1 text-xs text-[#71717A]">
                Latest invoices
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/billing/invoices",
                )
              }
              className="flex items-center gap-1 text-xs font-medium text-[#B08D57] hover:underline"
            >
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>

          {recentInvoicesLoading ? (
            <div className="flex min-h-48 items-center justify-center px-5">
              <p className="text-sm text-[#71717A]">
                Loading recent sales...
              </p>
            </div>
          ) : recentInvoicesError ? (
            <div className="flex min-h-48 items-center justify-center px-5">
              <div className="text-center">
                <p className="text-sm font-medium text-red-600">
                  Unable to load recent sales
                </p>

                <p className="mt-1 text-xs text-[#71717A]">
                  {recentInvoicesError}
                </p>
              </div>
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center px-5">
              <div className="text-center">
                <p className="text-sm font-medium text-[#18181B]">
                  No sales yet
                </p>

                <p className="mt-1 text-xs text-[#71717A]">
                  Your recent invoices will
                  appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#E4E4E7]">
              {recentInvoices.map(
                (invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#18181B]">
                        {invoice.customer
                          ?.full_name ??
                          "Walk-in Customer"}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#71717A]">
                        <span>
                          {
                            invoice.invoice_number
                          }
                        </span>

                        <span>•</span>

                        <span>
                          {new Date(
                            `${invoice.invoice_date}T00:00:00`,
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#18181B]">
                          ₹
                          {Number(
                            invoice.grand_total,
                          ).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </p>

                        <p className="mt-1 text-[10px] uppercase text-[#71717A]">
                          {invoice.status}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/billing/invoice/${invoice.id}`,
                          )
                        }
                        className="text-xs font-medium text-[#B08D57] hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Inventory alert */}
        <div className="rounded-xl border border-[#E4E4E7] bg-white">
          <div className="border-b border-[#E4E4E7] px-5 py-5">
            <h3 className="font-semibold text-[#18181B]">
              Inventory Watch
            </h3>

            <p className="mt-1 text-xs text-[#71717A]">
              Items that need attention
            </p>
          </div>

          <div className="flex min-h-48 items-center justify-center px-5">
            <div className="text-center">
              <p className="text-sm font-medium text-[#18181B]">
                No inventory data
              </p>

              <p className="mt-1 text-xs text-[#71717A]">
                Add inventory to start tracking
                ageing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}