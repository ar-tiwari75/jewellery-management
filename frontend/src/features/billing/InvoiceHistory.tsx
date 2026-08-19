import { useEffect, useState } from "react";
import {
  Eye,
  FileText,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getInvoices,
  type InvoiceHistoryItem,
} from "./invoiceHistory.service";

function formatCurrency(
  value: number,
): string {
  return `₹${Number(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatDate(
  value: string,
): string {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function InvoiceHistory() {
  const navigate = useNavigate();

  const [invoices, setInvoices] =
    useState<InvoiceHistoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [dateFilter, setDateFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState<
      "ALL" |
      "DRAFT" |
      "FINAL" |
      "CANCELLED"
    >("ALL");

  useEffect(() => {
    let mounted = true;

    async function loadInvoices() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getInvoices();

        if (!mounted) {
          return;
        }

        setInvoices(result);
      } catch (error) {
        console.error(
          "Failed to load invoice history:",
          error,
        );

        if (!mounted) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load invoices.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInvoices();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredInvoices =
    invoices.filter((invoice) => {
      const query =
        search.trim().toLowerCase();

      /*
       * Search filter
       */
      const matchesSearch =
        !query ||
        invoice.invoice_number
          .toLowerCase()
          .includes(query) ||
        invoice.customer?.full_name
          .toLowerCase()
          .includes(query) ||
        invoice.customer?.phone
          .includes(query);

      /*
       * Status filter
       */
      const matchesStatus =
        statusFilter === "ALL" ||
        invoice.status ===
          statusFilter;

      /*
       * Date filter
       */
      let matchesDate = true;

      if (dateFilter !== "all") {
        const invoiceDate =
          new Date(
            `${invoice.invoice_date}T00:00:00`,
          );

        const today = new Date();

        if (dateFilter === "today") {
          const todayString =
            getLocalDateString(today);

          matchesDate =
            invoice.invoice_date ===
            todayString;
        }

        if (dateFilter === "7days") {
          const sevenDaysAgo =
            new Date(today);

          sevenDaysAgo.setDate(
            today.getDate() - 7,
          );

          /*
           * Reset time so date comparison
           * is based only on calendar date.
           */
          sevenDaysAgo.setHours(
            0,
            0,
            0,
            0,
          );

          matchesDate =
            invoiceDate >=
            sevenDaysAgo;
        }

        if (dateFilter === "30days") {
          const thirtyDaysAgo =
            new Date(today);

          thirtyDaysAgo.setDate(
            today.getDate() - 30,
          );

          thirtyDaysAgo.setHours(
            0,
            0,
            0,
            0,
          );

          matchesDate =
            invoiceDate >=
            thirtyDaysAgo;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });

  const hasActiveFilters =
    search.trim() !== "" ||
    dateFilter !== "all" ||
    statusFilter !== "ALL";

  function clearFilters() {
    setSearch("");
    setDateFilter("all");
    setStatusFilter("ALL");
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <section>
        <p className="text-sm font-medium text-[#B08D57]">
          Billing
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#18181B]">
          Invoice History
        </h1>

        <p className="mt-1 text-sm text-[#71717A]">
          View and reprint previously generated
          invoices.
        </p>
      </section>

      {/* Filters */}
      <section className="rounded-xl border border-[#E4E4E7] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search invoice, customer or phone..."
              className="w-full rounded-lg border border-[#D4D4D8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
            />
          </div>

          {/* Date */}
          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(
                event.target.value,
              )
            }
            className="rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
          >
            <option value="all">
              All dates
            </option>

            <option value="today">
              Today
            </option>

            <option value="7days">
              Last 7 days
            </option>

            <option value="30days">
              Last 30 days
            </option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | "ALL"
                  | "DRAFT"
                  | "FINAL"
                  | "CANCELLED",
              )
            }
            className="rounded-lg border border-[#D4D4D8] bg-white px-3 py-2.5 text-sm text-[#18181B] outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]"
          >
            <option value="ALL">
              All status
            </option>

            <option value="FINAL">
              Final
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#B08D57] hover:bg-[#F5EFE6]"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results summary */}
      {!loading &&
        !error &&
        invoices.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#71717A]">
              Showing{" "}
              <span className="font-medium text-[#18181B]">
                {filteredInvoices.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#18181B]">
                {invoices.length}
              </span>{" "}
              invoices
            </p>
          </div>
        )}

      {/* Invoice table */}
      <section className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <p className="text-sm text-[#71717A]">
              Loading invoices...
            </p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-full bg-[#F5EFE6] p-3 text-[#B08D57]">
              <FileText size={20} />
            </div>

            <p className="mt-4 text-sm font-medium text-[#18181B]">
              {hasActiveFilters
                ? "No matching invoices"
                : "No invoices yet"}
            </p>

            <p className="mt-1 text-xs text-[#71717A]">
              {hasActiveFilters
                ? "Try changing your search or filters."
                : "Generated invoices will appear here."}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-xs font-medium text-[#B08D57] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA] text-left">
                  <th className="px-5 py-3 text-xs font-medium text-[#71717A]">
                    Invoice
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-[#71717A]">
                    Customer
                  </th>

                  <th className="px-5 py-3 text-xs font-medium text-[#71717A]">
                    Date
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium text-[#71717A]">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-medium text-[#71717A]">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-medium text-[#71717A]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map(
                  (invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-[#E4E4E7] last:border-b-0 hover:bg-[#FAFAFA]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-[#18181B]">
                          {
                            invoice.invoice_number
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-[#18181B]">
                          {invoice.customer
                            ?.full_name ??
                            "Walk-in Customer"}
                        </p>

                        {invoice.customer
                          ?.phone && (
                          <p className="mt-1 text-xs text-[#71717A]">
                            {
                              invoice
                                .customer
                                .phone
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-[#52525B]">
                        {formatDate(
                          invoice.invoice_date,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-[#18181B]">
                        {formatCurrency(
                          invoice.grand_total,
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${
                            invoice.status ===
                            "FINAL"
                              ? "bg-emerald-50 text-emerald-700"
                              : invoice.status ===
                                  "CANCELLED"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/billing/invoice/${invoice.id}`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4D4D8] px-3 py-2 text-xs font-medium text-[#18181B] hover:bg-[#F4F4F5]"
                          >
                            <Eye size={14} />
                            View / Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}