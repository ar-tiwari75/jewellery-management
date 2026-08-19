import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import InvoiceTemplate from "./InvoiceTemplate";
import {
  getInvoiceDocumentData,
  type InvoiceDocumentData,
} from "./invoiceDetails.service";

export default function InvoicePreview() {
  const { invoiceId } = useParams<{
    invoiceId: string;
  }>();

  const navigate = useNavigate();

  const [data, setData] =
    useState<InvoiceDocumentData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError("Invoice ID is missing.");
      setLoading(false);
      return;
    }

    loadInvoice(invoiceId);
  }, [invoiceId]);

  async function loadInvoice(
    id: string,
  ) {
    try {
      setLoading(true);
      setError(null);

      const result =
        await getInvoiceDocumentData(id);

      setData(result);
    } catch (error) {
      console.error(
        "Failed to load invoice preview:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load invoice.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-zinc-500">
          Loading invoice...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-zinc-500">
          Invoice not found.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      {/* Preview toolbar */}
      <div className="mx-auto mb-6 flex max-w-[794px] items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => navigate("/billing")}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          <ArrowLeft size={16} />
          Back to Billing
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C]"
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* Invoice */}
      <div className="invoice-print-area">
        <InvoiceTemplate data={data} />
      </div>
    </div>
  );
}