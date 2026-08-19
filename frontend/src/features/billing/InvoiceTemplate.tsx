import type {
  InvoiceDocumentData,
} from "./invoiceDetails.service";

interface InvoiceTemplateProps {
  data: InvoiceDocumentData;
}

function formatCurrency(
  value: number | null | undefined,
): string {
  return `₹${Number(value ?? 0).toLocaleString(
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
  const date = new Date(
    `${value}T00:00:00`,
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatMetal(
  metal: string,
): string {
  return metal === "GOLD"
    ? "Gold"
    : metal === "SILVER"
      ? "Silver"
      : metal;
}

export default function InvoiceTemplate({
  data,
}: InvoiceTemplateProps) {
  const {
    invoice,
    shop,
  } = data;

  const customer =
    invoice.customer;

  return (
    <div className="mx-auto w-full max-w-[794px] bg-white text-zinc-900 shadow-sm print:max-w-none print:shadow-none">
      {/* Shop Header */}
      <header className="border-b-2 border-zinc-900 px-8 py-7">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.shop_name}
                className="h-16 w-16 object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border border-zinc-300 text-[10px] text-zinc-400">
                LOGO
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {shop.shop_name}
              </h1>

              {shop.address && (
                <p className="mt-1 max-w-md text-xs leading-5 text-zinc-600">
                  {shop.address}
                </p>
              )}

              {shop.city && (
                <p className="text-xs text-zinc-600">
                  {shop.city}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                {shop.phone && (
                  <span>
                    Phone: {shop.phone}
                  </span>
                )}

                {shop.email && (
                  <span>
                    Email: {shop.email}
                  </span>
                )}
              </div>

              {shop.gstin && (
                <p className="mt-2 text-xs font-medium">
                  GSTIN: {shop.gstin}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
              Tax Invoice
            </p>

            <p className="mt-2 text-lg font-bold">
              {invoice.invoice_number}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Date:{" "}
              {formatDate(
                invoice.invoice_date,
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Status: {invoice.status}
            </p>
          </div>
        </div>
      </header>

      {/* Customer */}
      <section className="border-b border-zinc-200 px-8 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Bill To
        </p>

        {customer ? (
          <div className="mt-2">
            <p className="text-sm font-semibold">
              {customer.full_name}
            </p>

            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-600">
              <span>
                Phone: {customer.phone}
              </span>

              {customer.email && (
                <span>
                  Email: {customer.email}
                </span>
              )}
            </div>

            {(customer.address ||
              customer.city) && (
              <p className="mt-1 text-xs text-zinc-600">
                {[
                  customer.address,
                  customer.city,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}

            <p className="mt-1 text-[11px] text-zinc-500">
              Customer Code:{" "}
              {customer.customer_code}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Walk-in Customer
          </p>
        )}
      </section>

      {/* Items */}
      <section className="px-8 py-5">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-zinc-300 bg-zinc-50">
              <th className="px-2 py-2 text-left font-semibold">
                #
              </th>

              <th className="px-2 py-2 text-left font-semibold">
                Item
              </th>

              <th className="px-2 py-2 text-left font-semibold">
                Metal
              </th>

              <th className="px-2 py-2 text-left font-semibold">
                Purity
              </th>

              <th className="px-2 py-2 text-right font-semibold">
                Weight
              </th>

              <th className="px-2 py-2 text-right font-semibold">
                Rate
              </th>

              <th className="px-2 py-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {invoice.items.map(
              (item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-200"
                >
                  <td className="px-2 py-3">
                    {index + 1}
                  </td>

                  <td className="px-2 py-3">
                    <p className="font-medium">
                      {item.item_name}
                    </p>
                  </td>

                  <td className="px-2 py-3">
                    {formatMetal(
                      item.metal_type,
                    )}
                  </td>

                  <td className="px-2 py-3">
                    {item.purity}
                  </td>

                  <td className="px-2 py-3 text-right">
                    {item.weight.toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 3,
                      },
                    )}{" "}
                    g
                  </td>

                  <td className="px-2 py-3 text-right">
                    {formatCurrency(
                      item.metal_rate,
                    )}
                    <span className="ml-1 text-[9px] text-zinc-500">
                      /{item.metal_rate_unit}
                    </span>
                  </td>

                  <td className="px-2 py-3 text-right font-medium">
                    {formatCurrency(
                      item.taxable_amount,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </section>

      {/* Item charge breakdown */}
      <section className="px-8 pb-5">
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-3 py-2 text-left font-semibold">
                  Item
                </th>

                <th className="px-3 py-2 text-right font-semibold">
                  Metal Value
                </th>

                <th className="px-3 py-2 text-right font-semibold">
                  Wastage
                </th>

                <th className="px-3 py-2 text-right font-semibold">
                  Making
                </th>

                <th className="px-3 py-2 text-right font-semibold">
                  Discount
                </th>
              </tr>
            </thead>

            <tbody>
              {invoice.items.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="border-t border-zinc-200"
                  >
                    <td className="px-3 py-2">
                      {item.item_name}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {formatCurrency(
                        item.metal_value,
                      )}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {item.wastage_percent}%{" "}
                      {formatCurrency(
                        item.wastage_value,
                      )}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {formatCurrency(
                        item.making_charge,
                      )}
                    </td>

                    <td className="px-3 py-2 text-right">
                      {item.item_discount >
                      0
                        ? `- ${formatCurrency(
                            item.item_discount,
                          )}`
                        : "—"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totals */}
      <section className="flex justify-end px-8 pb-6">
        <div className="w-full max-w-sm space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-600">
              Subtotal
            </span>

            <span>
              {formatCurrency(
                invoice.subtotal,
              )}
            </span>
          </div>

          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-600">
                Discount
              </span>

              <span>
                -{" "}
                {formatCurrency(
                  invoice.discount,
                )}
              </span>
            </div>
          )}

          {invoice.gst > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-600">
                GST
              </span>

              <span>
                {formatCurrency(
                  invoice.gst,
                )}
              </span>
            </div>
          )}

          <div className="mt-3 flex justify-between border-t-2 border-zinc-900 pt-3 text-base font-bold">
            <span>
              Grand Total
            </span>

            <span>
              {formatCurrency(
                invoice.grand_total,
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-8 py-6 text-center">
        <p className="text-sm font-medium">
          Thank you for your business.
        </p>

        <p className="mt-1 text-[10px] text-zinc-500">
          This is a computer-generated invoice.
        </p>
      </footer>
    </div>
  );
}