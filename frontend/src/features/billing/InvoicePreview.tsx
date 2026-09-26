import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [data, setData] =
    useState<InvoiceDocumentData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [generatingPdf, setGeneratingPdf] =
    useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setError("Invoice ID is missing.");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadInvoice() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await getInvoiceDocumentData(invoiceId!);

        if (!mounted) {
          return;
        }

        setData(result);
      } catch (error) {
        console.error(
          "Failed to load invoice preview:",
          error,
        );

        if (!mounted) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load invoice.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInvoice();

    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  async function handleDownloadPdf() {
    if (!invoiceRef.current || !data) return;

    setGeneratingPdf(true);

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try Print > Save as PDF.");
    } finally {
      setGeneratingPdf(false);
    }
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-[#B08D57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9C7B4C] disabled:opacity-50"
          >
            <Download size={16} />
            {generatingPdf ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="invoice-print-area" ref={invoiceRef}>
        <InvoiceTemplate data={data} showWatermark={true} />
      </div>
    </div>
  );
}