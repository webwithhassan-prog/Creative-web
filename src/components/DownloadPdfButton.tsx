"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { btnSecondary } from "@/lib/ui";

export type PdfInvoiceItem = { label: string; qty: string; rate: string; amount: string };

export type PdfInvoiceData = {
  companyName: string;
  companyAddress?: string;
  companyContact?: string;
  companyGstin?: string;
  docTitle: string;
  invoiceNo?: string;
  date: string;
  partyLabel: string;
  partyName: string;
  partyGstin?: string;
  items: PdfInvoiceItem[];
  subtotal: string;
  hideSubtotal?: boolean;
  taxLabel?: string;
  taxAmount?: string;
  total: string;
  totalLabel?: string;
  notes?: string;
  columnLabels?: { desc: string; qty: string; rate: string; amount: string };
};

async function generate(data: PdfInvoiceData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.companyName, marginX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  if (data.companyAddress) {
    doc.text(data.companyAddress, marginX, y);
    y += 12;
  }
  if (data.companyContact) {
    doc.text(data.companyContact, marginX, y);
    y += 12;
  }
  if (data.companyGstin) {
    doc.text(`GSTIN: ${data.companyGstin}`, marginX, y);
    y += 12;
  }

  doc.setDrawColor(200);
  y += 4;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.docTitle, marginX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (data.invoiceNo) {
    doc.text(`Invoice No: ${data.invoiceNo}`, marginX, y);
  }
  doc.text(`Date: ${data.date}`, pageWidth - marginX, y, { align: "right" });
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.text(data.partyLabel, marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(data.partyName, marginX, y);
  y += 14;
  if (data.partyGstin) {
    doc.text(`GSTIN: ${data.partyGstin}`, marginX, y);
    y += 14;
  }

  y += 12;
  const colX = { desc: marginX, qty: pageWidth - marginX - 220, rate: pageWidth - marginX - 140, amount: pageWidth - marginX };
  const labels = data.columnLabels ?? { desc: "Description", qty: "Qty", rate: "Rate", amount: "Amount" };
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(labels.desc, colX.desc, y);
  doc.text(labels.qty, colX.qty, y, { align: "right" });
  doc.text(labels.rate, colX.rate, y, { align: "right" });
  doc.text(labels.amount, colX.amount, y, { align: "right" });
  y += 6;
  doc.setDrawColor(160);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  for (const item of data.items) {
    if (y > 740) {
      doc.addPage();
      y = 56;
    }
    doc.text(item.label, colX.desc, y, { maxWidth: colX.qty - colX.desc - 12 });
    doc.text(item.qty, colX.qty, y, { align: "right" });
    doc.text(item.rate, colX.rate, y, { align: "right" });
    doc.text(item.amount, colX.amount, y, { align: "right" });
    y += 16;
  }

  y += 6;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  if (!data.hideSubtotal) {
    doc.text("Subtotal", colX.rate, y, { align: "right" });
    doc.text(data.subtotal, colX.amount, y, { align: "right" });
    y += 16;
  }

  if (data.taxLabel && data.taxAmount) {
    doc.text(data.taxLabel, colX.rate, y, { align: "right" });
    doc.text(data.taxAmount, colX.amount, y, { align: "right" });
    y += 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.totalLabel ?? "Total", colX.rate, y, { align: "right" });
  doc.text(data.total, colX.amount, y, { align: "right" });
  y += 24;

  if (data.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(`Notes: ${data.notes}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
  }

  const filenameBase = (data.invoiceNo || data.docTitle).replace(/[^a-z0-9-]+/gi, "-");
  doc.save(`${filenameBase}.pdf`);
}

export function DownloadPdfButton({ data }: { data: PdfInvoiceData }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await generate(data);
        } finally {
          setBusy(false);
        }
      }}
      className={btnSecondary}
    >
      <FileDown size={16} /> {busy ? "Generating…" : "Download PDF"}
    </button>
  );
}
