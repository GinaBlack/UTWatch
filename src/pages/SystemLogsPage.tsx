import { useState, useEffect } from "react";
import { History, Search, Filter, Activity, Server, ShieldCheck, Download, RefreshCw, User, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "../firebase/firebase_config";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";

const SystemLogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "audit_logs"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch audit logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (ts: any) => {
    if (!ts) return "N/A";
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "LOGIN": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "LOGOUT": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      case "REGISTER": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CLEAR_ALERTS": return "bg-destructive/10 text-destructive border-destructive/20";
      case "UPDATE_THRESHOLD": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "ACCESS_DENIED": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const filteredLogs = logs.filter(log => 
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight">Audit Trail</h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">System Accountability & Security Log</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter by user or action..."
              className="pl-8 w-[250px] font-mono text-xs bg-secondary/50 border-none h-10"
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 border-border/50">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <User className="h-4 w-4 text-primary mx-auto mb-2" />
            <p className="text-[9px] font-mono uppercase text-muted-foreground">Unique Actors</p>
            <p className="text-xl font-bold font-mono">{new Set(logs.map(l => l.userId)).size}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <Activity className="h-4 w-4 text-emerald-500 mx-auto mb-2" />
            <p className="text-[9px] font-mono uppercase text-muted-foreground">Actions Logged</p>
            <p className="text-xl font-bold font-mono">{logs.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <Zap className="h-4 w-4 text-amber-500 mx-auto mb-2" />
            <p className="text-[9px] font-mono uppercase text-muted-foreground">Critical Events</p>
            <p className="text-xl font-bold font-mono">{logs.filter(l => l.action === "UPDATE_THRESHOLD" || l.action === "ACCESS_DENIED").length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-4 w-4 text-blue-500 mx-auto mb-2" />
            <p className="text-[9px] font-mono uppercase text-muted-foreground">Auth Integrity</p>
            <p className="text-xl font-bold font-mono">SECURE</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
        <div className="scan-line absolute inset-0 opacity-20 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold font-mono uppercase">
            Live System Audit
          </CardTitle>
          {loading && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-[10px] font-mono uppercase w-[180px]">Timestamp</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">User/Operator</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Action</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Resource</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-border/50 hover:bg-secondary/20 transition-colors">
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-[11px] font-mono uppercase tracking-tight">{log.userName}</span>
                          <span className="text-[9px] font-mono text-primary opacity-70">{log.userRole}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[9px] font-mono font-bold ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] uppercase">{log.resource}</TableCell>
                      <TableCell className="text-[11px] font-mono leading-tight text-muted-foreground italic">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center font-mono text-xs text-muted-foreground uppercase tracking-widest">
                      {loading ? "Decrypting Audit Logs..." : "No matching records found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemLogsPage;
