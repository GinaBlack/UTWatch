import { useState, useEffect } from "react";
import { FileText, Download, FileSpreadsheet, File as FilePdf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ReportsPage = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/alerts');
        const data = await response.json();
        setAlerts(data.alerts);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const downloadPdf = () => {
    const printContent = `
      <html>
        <head>
          <title>UT Watch - Alerts Report</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #f0f0f0; }
            .header-info { margin-bottom: 20px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <h1>UT WATCH - SYSTEM INCIDENT REPORT</h1>
          <div class="header-info">
            <span>Generated: ${new Date().toLocaleString()}</span>
            <span>Total Incidents: ${alerts.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Camera ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${alerts.map(alert => `
                <tr>
                  <td>${new Date(alert.timestamp * 1000).toLocaleString()}</td>
                  <td>${alert.type.toUpperCase()}</td>
                  <td>${alert.camera_id}</td>
                  <td>${alert.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadExcel = () => {
    const headers = ["Timestamp", "Type", "Camera_ID", "Details"];
    const rows = alerts.map(alert => [
      new Date(alert.timestamp * 1000).toISOString(),
      alert.type,
      alert.camera_id,
      alert.details
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ut_watch_incidents_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight">System Reports</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadPdf} variant="outline" className="gap-2 font-mono text-xs" disabled={loading}>
            <FilePdf className="h-4 w-4" />
            GENERATE PDF
          </Button>
          <Button onClick={downloadExcel} variant="outline" className="gap-2 font-mono text-xs" disabled={loading}>
            <FileSpreadsheet className="h-4 w-4" />
            EXPORT CSV
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold font-mono uppercase">Incident Log History</CardTitle>
          <CardDescription className="text-[10px] font-mono uppercase tracking-wider">Comprehensive breakdown of all detected alerts from system vision nodes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-xs font-mono">Compiling system records...</p>
            </div>
          ) : alerts.length > 0 ? (
            <Table id="reports-table">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-mono uppercase">Timestamp</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Type</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Source Node</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Event Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert, i) => (
                  <TableRow key={i} className="border-border/50 hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(alert.timestamp * 1000).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-bold font-mono border border-destructive/20">
                        {alert.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-primary">{alert.camera_id}</TableCell>
                    <TableCell className="font-mono text-[11px] text-foreground">{alert.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg border-border/50">
              <p className="text-xs font-mono uppercase">No incidents recorded in current database</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
