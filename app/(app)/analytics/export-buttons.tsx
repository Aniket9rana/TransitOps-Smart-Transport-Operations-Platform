"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { FleetReportRow } from "@/lib/metrics";

export type ReportHeadline = {
  fuelEfficiency: number;
  utilizationPct: number;
  operationalCost: number;
  roiPct: number;
};

/** Money for the PDF — the default PDF font lacks the ₹ glyph, so use "Rs". */
function pdfMoney(n: number): string {
  return `Rs ${n.toLocaleString("en-IN")}`;
}

export function ExportButtons({
  rows,
  headline,
}: {
  rows: FleetReportRow[];
  headline: ReportHeadline;
}) {
  const [generating, setGenerating] = useState(false);

  async function handlePdf() {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("TransitOps — Fleet Report", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated ${new Date().toLocaleDateString("en-IN")}`, 14, 25);

      doc.setTextColor(30);
      doc.setFontSize(10);
      doc.text(
        [
          `Fuel Efficiency: ${headline.fuelEfficiency} km/l`,
          `Fleet Utilization: ${headline.utilizationPct}%`,
          `Operational Cost: ${pdfMoney(headline.operationalCost)}`,
          `Vehicle ROI: ${headline.roiPct}%`,
        ].join("     "),
        14,
        33
      );

      autoTable(doc, {
        startY: 40,
        head: [[
          "Reg No", "Vehicle", "Type", "Status",
          "Fuel", "Maint.", "Operational", "Other", "Revenue", "ROI %",
        ]],
        body: rows.map((r) => [
          r.registrationNumber,
          r.name,
          r.type,
          r.status,
          pdfMoney(r.fuel),
          pdfMoney(r.maintenance),
          pdfMoney(r.operational),
          pdfMoney(r.other),
          pdfMoney(r.revenue),
          `${r.roiPct}%`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [194, 132, 28], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save("transitops-fleet-report.pdf");
      toast.success("PDF exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href="/analytics/export/csv"
        className={buttonVariants({ variant: "outline", size: "default" })}
        download
      >
        <Download />
        Export CSV
      </a>
      <Button variant="outline" onClick={handlePdf} disabled={generating}>
        <FileText />
        {generating ? "Generating…" : "Export PDF"}
      </Button>
    </div>
  );
}
