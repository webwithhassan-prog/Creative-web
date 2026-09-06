"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import { PDF_COLOR, setPdfColor, drawLetterhead, drawFooter, pdfFilename } from "@/lib/pdf";

export type PdfInvoiceItem = { label: string; qty: string; rate: string; amount: string };

export type PdfInvoiceData = {
  companyName: string;
  companyAddress?: string;
  companyContact?: string;
  companyGstin?: string;
  companyLogo?: string;
  docTitle: string;
  isReturn?: boolean;
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - 56;

  let y = await drawLetterhead(doc, marginX, pageWidth, 54, data);

  // ---- Document title + return badge ----
  setPdfColor(doc, "text", PDF_COLOR.forestDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.docTitle.toUpperCase(), marginX, y);

  if (data.isReturn) {
    const badgeText = "RETURN";
    doc.setFontSize(8);
    const badgeW = doc.getTextWidth(badgeText) + 14;
    const badgeX = marginX + doc.getTextWidth(data.docTitle.toUpperCase()) + 12;
    setPdfColor(doc, "fill", PDF_COLOR.maroon);
    doc.roundedRect(badgeX, y - 11, badgeW, 15, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(badgeText, badgeX + 7, y - 1);
  }
  y += 22;

  // ---- Invoice meta + party block ----
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setPdfColor(doc, "text", PDF_COLOR.inkSoft);
  if (data.invoiceNo) doc.text("Invoice No.", marginX, y);
  doc.text("Date", pageWidth - marginX - 140, y, { align: "left" });

  doc.setFont("helvetica", "bold");
  setPdfColor(doc, "text", PDF_COLOR.ink);
  doc.setFontSize(10.5);
  if (data.invoiceNo) doc.text(data.invoiceNo, marginX, y + 14);
  doc.text(data.date, pageWidth - marginX - 140, y + 14, { align: "left" });
  y += 34;

  setPdfColor(doc, "draw", PDF_COLOR.rule);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setPdfColor(doc, "text", PDF_COLOR.inkSoft);
  doc.text(data.partyLabel.toUpperCase(), marginX, y);
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  setPdfColor(doc, "text", PDF_COLOR.forestDark);
  doc.text(data.partyName, marginX, y);
  y += 15;
  if (data.partyGstin) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setPdfColor(doc, "text", PDF_COLOR.inkSoft);
    doc.text(`GSTIN: ${data.partyGstin}`, marginX, y);
    y += 15;
  }

  y += 14;

  // ---- Table ----
  const labels = data.columnLabels ?? { desc: "Description", qty: "Qty", rate: "Rate", amount: "Amount" };
  const colX = {
    desc: marginX,
    qty: pageWidth - marginX - 220,
    rate: pageWidth - marginX - 140,
    amount: pageWidth - marginX,
  };
  const rowHeight = 18;

  function drawTableHeader() {
    setPdfColor(doc, "fill", PDF_COLOR.headerFill);
    doc.rect(marginX, y - 13, pageWidth - marginX * 2, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(labels.desc.toUpperCase(), colX.desc + 6, y + 1);
    doc.text(labels.qty.toUpperCase(), colX.qty, y + 1, { align: "right" });
    doc.text(labels.rate.toUpperCase(), colX.rate, y + 1, { align: "right" });
    doc.text(labels.amount.toUpperCase(), colX.amount - 6, y + 1, { align: "right" });
    y += 15;
  }

  function newPage() {
    doc.addPage();
    y = 56;
    drawTableHeader();
  }

  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  data.items.forEach((item, idx) => {
    if (y > contentBottom - rowHeight) newPage();

    if (idx % 2 === 1) {
      setPdfColor(doc, "fill", PDF_COLOR.bandFill);
      doc.rect(marginX, y - 12, pageWidth - marginX * 2, rowHeight, "F");
    }
    setPdfColor(doc, "text", PDF_COLOR.ink);
    doc.text(item.label, colX.desc + 6, y, { maxWidth: colX.qty - colX.desc - 16 });
    doc.text(item.qty, colX.qty, y, { align: "right" });
    doc.text(item.rate, colX.rate, y, { align: "right" });
    doc.text(item.amount, colX.amount - 6, y, { align: "right" });
    y += rowHeight;
  });

  setPdfColor(doc, "draw", PDF_COLOR.rule);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // ---- Totals ----
  if (y > contentBottom - 90) newPage();

  doc.setFontSize(9.5);
  if (!data.hideSubtotal) {
    doc.setFont("helvetica", "normal");
    setPdfColor(doc, "text", PDF_COLOR.inkSoft);
    doc.text("Subtotal", colX.rate, y, { align: "right" });
    setPdfColor(doc, "text", PDF_COLOR.ink);
    doc.text(data.subtotal, colX.amount - 6, y, { align: "right" });
    y += 17;
  }

  if (data.taxLabel && data.taxAmount) {
    doc.setFont("helvetica", "normal");
    setPdfColor(doc, "text", PDF_COLOR.inkSoft);
    doc.text(data.taxLabel, colX.rate, y, { align: "right" });
    setPdfColor(doc, "text", PDF_COLOR.ink);
    doc.text(data.taxAmount, colX.amount - 6, y, { align: "right" });
    y += 17;
  }

  y += 4;
  const totalBoxW = pageWidth - marginX - colX.rate + 6;
  setPdfColor(doc, "fill", PDF_COLOR.forest);
  doc.roundedRect(colX.rate - 6, y - 15, totalBoxW, 26, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(data.totalLabel ?? "Total", colX.rate, y + 2, { align: "right" });
  doc.text(data.total, colX.amount - 6, y + 2, { align: "right" });
  y += 30;

  if (data.notes) {
    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setPdfColor(doc, "text", PDF_COLOR.inkSoft);
    doc.text(`Notes: ${data.notes}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
  }

  drawFooter(doc, marginX, pageWidth, pageHeight, data.companyName);
  doc.save(pdfFilename(data.invoiceNo || data.docTitle));
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
