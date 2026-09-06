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

// Matches the app's CSS custom properties (globals.css) so the PDF reads as
// the same brand, not a generic document.
const COLOR = {
  forest: [4, 120, 87] as const,
  forestDark: [6, 78, 59] as const,
  gold: [217, 119, 6] as const,
  maroon: [220, 38, 38] as const,
  ink: [15, 23, 42] as const,
  inkSoft: [82, 96, 109] as const,
  rule: [225, 228, 232] as const,
  bandFill: [240, 247, 244] as const, // faint forest tint for zebra rows
  headerFill: [6, 78, 59] as const,
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Logos can be uploaded as PNG, JPEG, WebP or SVG. jsPDF's addImage needs an
 * explicit raster format and can't embed SVG at all, so rasterize through a
 * canvas first — this works uniformly regardless of the source format.
 */
async function rasterizeLogo(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1;
    canvas.height = img.naturalHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

async function generate(data: PdfInvoiceData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - 56;
  let y = 54;

  const setColor = (target: "fill" | "text" | "draw", c: readonly [number, number, number]) => {
    if (target === "fill") doc.setFillColor(c[0], c[1], c[2]);
    else if (target === "text") doc.setTextColor(c[0], c[1], c[2]);
    else doc.setDrawColor(c[0], c[1], c[2]);
  };

  // ---- Letterhead ----
  let logoBox: { w: number; h: number } | null = null;
  if (data.companyLogo) {
    const raster = await rasterizeLogo(data.companyLogo);
    if (raster) {
      const maxSize = 44;
      const ratio = raster.width / raster.height || 1;
      const w = ratio >= 1 ? maxSize : maxSize * ratio;
      const h = ratio >= 1 ? maxSize / ratio : maxSize;
      doc.addImage(raster.dataUrl, "PNG", marginX, y, w, h);
      logoBox = { w, h };
    }
  }

  const textX = marginX + (logoBox ? logoBox.w + 14 : 0);
  let ty = y + 4;
  setColor("text", COLOR.forestDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(data.companyName, textX, ty + 14);
  ty += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor("text", COLOR.inkSoft);
  const contactLines = [data.companyAddress, data.companyContact, data.companyGstin ? `GSTIN: ${data.companyGstin}` : undefined].filter(
    Boolean
  ) as string[];
  for (const line of contactLines) {
    doc.text(line, textX, ty + 10);
    ty += 13;
  }

  y = Math.max(y + (logoBox?.h ?? 0), ty) + 12;
  setColor("draw", COLOR.gold);
  doc.setLineWidth(2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 28;

  // ---- Document title + return badge ----
  setColor("text", COLOR.forestDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.docTitle.toUpperCase(), marginX, y);

  if (data.isReturn) {
    const badgeText = "RETURN";
    doc.setFontSize(8);
    const badgeW = doc.getTextWidth(badgeText) + 14;
    const badgeX = marginX + doc.getTextWidth(data.docTitle.toUpperCase()) + 12;
    setColor("fill", COLOR.maroon);
    doc.roundedRect(badgeX, y - 11, badgeW, 15, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(badgeText, badgeX + 7, y - 1);
  }
  y += 22;

  // ---- Invoice meta + party block ----
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor("text", COLOR.inkSoft);
  if (data.invoiceNo) doc.text("Invoice No.", marginX, y);
  doc.text("Date", pageWidth - marginX - 140, y, { align: "left" });

  doc.setFont("helvetica", "bold");
  setColor("text", COLOR.ink);
  doc.setFontSize(10.5);
  if (data.invoiceNo) doc.text(data.invoiceNo, marginX, y + 14);
  doc.text(data.date, pageWidth - marginX - 140, y + 14, { align: "left" });
  y += 34;

  setColor("draw", COLOR.rule);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor("text", COLOR.inkSoft);
  doc.text(data.partyLabel.toUpperCase(), marginX, y);
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  setColor("text", COLOR.forestDark);
  doc.text(data.partyName, marginX, y);
  y += 15;
  if (data.partyGstin) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor("text", COLOR.inkSoft);
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
    setColor("fill", COLOR.headerFill);
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
      setColor("fill", COLOR.bandFill);
      doc.rect(marginX, y - 12, pageWidth - marginX * 2, rowHeight, "F");
    }
    setColor("text", COLOR.ink);
    doc.text(item.label, colX.desc + 6, y, { maxWidth: colX.qty - colX.desc - 16 });
    doc.text(item.qty, colX.qty, y, { align: "right" });
    doc.text(item.rate, colX.rate, y, { align: "right" });
    doc.text(item.amount, colX.amount - 6, y, { align: "right" });
    y += rowHeight;
  });

  setColor("draw", COLOR.rule);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // ---- Totals ----
  if (y > contentBottom - 90) newPage();

  doc.setFontSize(9.5);
  if (!data.hideSubtotal) {
    doc.setFont("helvetica", "normal");
    setColor("text", COLOR.inkSoft);
    doc.text("Subtotal", colX.rate, y, { align: "right" });
    setColor("text", COLOR.ink);
    doc.text(data.subtotal, colX.amount - 6, y, { align: "right" });
    y += 17;
  }

  if (data.taxLabel && data.taxAmount) {
    doc.setFont("helvetica", "normal");
    setColor("text", COLOR.inkSoft);
    doc.text(data.taxLabel, colX.rate, y, { align: "right" });
    setColor("text", COLOR.ink);
    doc.text(data.taxAmount, colX.amount - 6, y, { align: "right" });
    y += 17;
  }

  y += 4;
  const totalBoxW = pageWidth - marginX - colX.rate + 6;
  setColor("fill", COLOR.forest);
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
    setColor("text", COLOR.inkSoft);
    doc.text(`Notes: ${data.notes}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
  }

  // ---- Footer on every page ----
  const totalPages = doc.getNumberOfPages();
  const generatedOn = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setColor("draw", COLOR.rule);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 40, pageWidth - marginX, pageHeight - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setColor("text", COLOR.inkSoft);
    doc.text(`Generated by ${data.companyName} · ${generatedOn}`, marginX, pageHeight - 28);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, pageHeight - 28, { align: "right" });
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
