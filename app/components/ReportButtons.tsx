"use client";

export default function ReportButtons() {
  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const reportElement = document.getElementById("fraud-report");

    if (!reportElement) return;

    const doc = new jsPDF({
      unit: "pt",
      format: "letter",
      orientation: "portrait",
    });

    const text = reportElement.innerText || "";
    const lines = doc.splitTextToSize(text, 500);

    let y = 50;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    lines.forEach((line: string) => {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }

      doc.text(line, 50, y);
      y += 16;
    });

    doc.save("fraud-review-report.pdf");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Print Report
      </button>

      <button
        type="button"
        onClick={downloadPdf}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
      >
        Download PDF
      </button>
    </div>
  );
}