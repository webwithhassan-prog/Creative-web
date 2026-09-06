"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import { PDF_COLOR, setPdfColor, drawLetterhead, drawFooter, pdfFilename, type PdfLetterheadData } from "@/lib/pdf";

export type ReportPdfColumn = { label: string; align?: "left" | "right" };
export type ReportPdfSection = {
  heading?: string;
  columns: ReportPdfColumn[];
  rows: string[][];
  totalsRow?: string[];
  emptyMessage?: string;
};
export type ReportPdfStat = { label: string; value: string; hint?: string };

export type ReportPdfData = PdfLetterheadData & {
  title: string;
  subtitle?: string;
  stats?: ReportPdfStat[];
  sections: ReportPdfSection[];
};

async function generate(data: ReportPdfData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - 56;

  let y = await drawLetterhead(doc, marginX, pageWidth, 54, data);

  setPdfColor(doc, "text", PDF_COLOR.forestDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.title, marginX, y);
  y += 16;

  if (data.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setPdfColor(doc, "text", PDF_COLOR.inkSoft);
    doc.text(data.subtitle, marginX, y, { maxWidth: pageWidth - marginX * 2 });
    y += 16;
  }
  y += 8;

  function ensureRoom(needed: number) {
    if (y > contentBottom - needed) {
      doc.addPage();
      y = 56;
    }
  }

  // ---- Stat boxes ----
  if (data.stats && data.stats.length > 0) {
    ensureRoom(60);
    const gap = 10;
    const boxW = (pageWidth - marginX * 2 - gap * (data.stats.length - 1)) / data.stats.length;
    const boxH = 52;
    data.stats.forEach((stat, i) => {
      const x = marginX + i * (boxW + gap);
      setPdfColor(doc, "draw", PDF_COLOR.rule);
      doc.setLineWidth(0.75);
      doc.roundedRect(x, y, boxW, boxH, 3, 3, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      setPdfColor(doc, "text", PDF_COLOR.inkSoft);
      doc.text(stat.label.toUpperCase(), x + 8, y + 15, { maxWidth: boxW - 16 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      setPdfColor(doc, "text", PDF_COLOR.forestDark);
      doc.text(stat.value, x + 8, y + 33, { maxWidth: boxW - 16 });
      if (stat.hint) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        setPdfColor(doc, "text", PDF_COLOR.inkSoft);
        doc.text(stat.hint, x + 8, y + 44, { maxWidth: boxW - 16 });
      }
    });
    y += boxH + 20;
  }

  // ---- Sections ----
  for (const section of data.sections) {
    const dense = section.columns.length > 5;
    const headerFontSize = dense ? 7 : 8.5;
    const bodyFontSize = dense ? 7.5 : 9;
    const rowHeight = dense ? 15 : 18;

    ensureRoom(60);

    if (section.heading) {
      setPdfColor(doc, "text", PDF_COLOR.forestDark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(section.heading, marginX, y);
      y += 16;
    }

    const numCols = section.columns.length;
    const firstColWeight = 2;
    const totalWeight = firstColWeight + (numCols - 1);
    const unitWidth = (pageWidth - marginX * 2) / totalWeight;
    const colWidths = section.columns.map((_, i) => (i === 0 ? unitWidth * firstColWeight : unitWidth));
    const colStartX = colWidths.reduce<number[]>((acc, w, i) => {
      acc.push(i === 0 ? marginX : acc[i - 1] + colWidths[i - 1]);
      return acc;
    }, []);

    function drawRow(cells: string[], opts: { bold?: boolean; color?: readonly [number, number, number] } = {}) {
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(bodyFontSize);
      setPdfColor(doc, "text", opts.color ?? PDF_COLOR.ink);
      section.columns.forEach((col, i) => {
        const text = cells[i] ?? "";
        const x = col.align === "right" ? colStartX[i] + colWidths[i] - 6 : colStartX[i] + 6;
        doc.text(text, x, y, {
          align: col.align === "right" ? "right" : "left",
          maxWidth: colWidths[i] - 12,
        });
      });
    }

    function drawHeader() {
      setPdfColor(doc, "fill", PDF_COLOR.headerFill);
      doc.rect(marginX, y - (dense ? 10 : 13), pageWidth - marginX * 2, dense ? 16 : 20, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(headerFontSize);
      doc.setTextColor(255, 255, 255);
      section.columns.forEach((col, i) => {
        const x = col.align === "right" ? colStartX[i] + colWidths[i] - 6 : colStartX[i] + 6;
        doc.text(col.label.toUpperCase(), x, y + 1, { align: col.align === "right" ? "right" : "left" });
      });
      y += dense ? 12 : 15;
    }

    function newPage() {
      doc.addPage();
      y = 56;
      drawHeader();
    }

    drawHeader();

    if (section.rows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(bodyFontSize);
      setPdfColor(doc, "text", PDF_COLOR.inkSoft);
      doc.text(section.emptyMessage ?? "No data.", marginX + 6, y);
      y += rowHeight;
    } else {
      section.rows.forEach((row, idx) => {
        if (y > contentBottom - rowHeight) newPage();
        if (idx % 2 === 1) {
          setPdfColor(doc, "fill", PDF_COLOR.bandFill);
          doc.rect(marginX, y - (dense ? 10 : 12), pageWidth - marginX * 2, rowHeight, "F");
        }
        drawRow(row);
        y += rowHeight;
      });
    }

    if (section.totalsRow) {
      if (y > contentBottom - rowHeight) newPage();
      setPdfColor(doc, "draw", PDF_COLOR.rule);
      doc.setLineWidth(1);
      doc.line(marginX, y - (dense ? 10 : 12), pageWidth - marginX, y - (dense ? 10 : 12));
      drawRow(section.totalsRow, { bold: true, color: PDF_COLOR.forestDark });
      y += rowHeight;
    }

    y += 20;
  }

  drawFooter(doc, marginX, pageWidth, pageHeight, data.companyName);
  doc.save(pdfFilename(data.title));
}

export function DownloadReportPdfButton({ data }: { data: ReportPdfData }) {
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
