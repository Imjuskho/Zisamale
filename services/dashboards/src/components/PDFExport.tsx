import { useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  filename?: string;
}

export function PDFExport({ targetRef, filename = "zisamale-report.pdf" }: Props) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    const el = targetRef.current;
    if (!el || exporting) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let yPos = 0;
      const pageH = 297;
      while (yPos < imgHeight) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yPos, imgWidth, imgHeight);
        yPos += pageH;
      }

      pdf.save(filename);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      className="pdf-export-btn"
      onClick={handleExport}
      disabled={exporting}
      aria-label="Export dashboard to PDF"
    >
      {exporting ? "Exporting..." : "Export PDF"}
    </button>
  );
}
