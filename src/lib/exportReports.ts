import jsPDF from "jspdf";
import type { TrafficAlert } from "@/types/traffic";

const fmt = (t: number) => new Date(t).toISOString().replace("T", " ").slice(0, 19);

export function exportAlertsCSV(alerts: TrafficAlert[]) {
  const header = ["id", "timestamp", "severity", "title", "message", "cameraId", "acknowledged"];
  const rows = alerts.map((a) =>
    [
      a.id,
      fmt(a.timestamp),
      a.severity,
      a.title,
      a.message.replace(/"/g, '""'),
      a.cameraId,
      a.acknowledged ? "yes" : "no",
    ]
      .map((v) => `"${String(v)}"`)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  download(`incident-report-${Date.now()}.csv`, "text/csv", csv);
}

export function exportAlertsPDF(alerts: TrafficAlert[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SentinelTraffic — Incident Report", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  doc.text(`Total incidents: ${alerts.length}`, pageW - margin, y, { align: "right" });
  y += 18;

  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  if (alerts.length === 0) {
    doc.setTextColor(80);
    doc.text("No incidents recorded.", margin, y);
  }

  const sevColor: Record<string, [number, number, number]> = {
    info: [56, 189, 248],
    warning: [245, 158, 11],
    critical: [239, 68, 68],
  };

  alerts.forEach((a, i) => {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    const [r, g, b] = sevColor[a.severity] ?? [100, 100, 100];
    doc.setFillColor(r, g, b);
    doc.rect(margin, y - 9, 8, 12, "F");

    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${i + 1}. ${a.title}`, margin + 16, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`${fmt(a.timestamp)}  ·  ${a.cameraId}  ·  ${a.severity.toUpperCase()}  ·  ${a.acknowledged ? "ACK" : "OPEN"}`, margin + 16, y + 12);

    doc.setTextColor(60);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(a.message, pageW - margin * 2 - 16);
    doc.text(lines, margin + 16, y + 26);

    y += 26 + lines.length * 12 + 10;
    doc.setDrawColor(230);
    doc.line(margin, y - 4, pageW - margin, y - 4);
  });

  doc.save(`incident-report-${Date.now()}.pdf`);
}

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
