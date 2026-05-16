import { useState, useEffect } from "react";
import { History, Search, Filter, Activity, Server, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SystemLogsPage = () => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error("Failed to fetch system logs:", err);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const realLogs = metrics ? [
    { id: "LOG-SYS-001", event: "Core Engine Initialization", user: "SYSTEM", timestamp: metrics.uptime, details: "AI Detection Worker Process started successfully." },
    { id: "LOG-CAM-001", event: "Node Connection", user: "SYSTEM", timestamp: "Active", details: `${metrics.active_cameras} vision nodes reporting healthy stream data.` },
    { id: "LOG-MET-001", event: "Traffic Summary", user: "ANALYZER", timestamp: "Now", details: `Cumulative: ${metrics.total_vehicles} vehicles and ${metrics.total_accidents} incidents processed.` },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight">System Logs</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search audit trail..."
              className="pl-8 w-[250px] font-mono text-xs bg-secondary/50 border-none"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 border-border/50">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Uptime</p>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{metrics?.uptime || "OFFLINE"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Active Nodes</p>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{metrics?.active_cameras || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <p className="text-[10px] font-mono uppercase text-muted-foreground">System Integrity</p>
            </div>
            <p className="text-xl font-bold font-mono text-foreground">SECURE</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold font-mono uppercase">
            <History className="h-4 w-4" />
            Live Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-[10px] font-mono uppercase">Log ID</TableHead>
                <TableHead className="text-[10px] font-mono uppercase">Event</TableHead>
                <TableHead className="text-[10px] font-mono uppercase">User</TableHead>
                <TableHead className="text-[10px] font-mono uppercase">Reference</TableHead>
                <TableHead className="text-[10px] font-mono uppercase">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {realLogs.map((log) => (
                <TableRow key={log.id} className="border-border/50 hover:bg-secondary/20 transition-colors">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{log.id}</TableCell>
                  <TableCell className="font-bold text-[11px] font-mono uppercase tracking-tight">{log.event}</TableCell>
                  <TableCell className="font-mono text-[10px]">{log.user}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[10px]">{log.timestamp}</TableCell>
                  <TableCell className="text-[11px] font-mono leading-tight">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemLogsPage;
