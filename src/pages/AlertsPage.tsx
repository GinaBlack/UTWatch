import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, CheckCheck, Filter, Search, Trash2 } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { useNotifications, useAuth } from "@/components/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logSystemAction } from "@/lib/audit";

const AlertsPage = () => {
  const { user } = useAuth();
  const { notifications, markAllNotificationsRead, clearNotifications } = useNotifications();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const isEmergencyResponder = user?.role === "Emergency Responder";

  const handleMarkAllRead = async () => {
    if (isEmergencyResponder) return;
    markAllNotificationsRead();
    if (user) {
      await logSystemAction({
        userId: user.uid,
        userName: user.name,
        userRole: user.role,
        action: "ALERTS_MARK_READ",
        resource: "ALERTS_UI",
        details: `${user.name} marked all active notifications as read.`
      });
    }
  };

  const handleClearAll = async () => {
    if (isEmergencyResponder) return;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/alerts/clear`, { method: 'POST' });
      if (response.ok) {
        clearNotifications();
        if (user) {
          await logSystemAction({
            userId: user.uid,
            userName: user.name,
            userRole: user.role,
            action: "CLEAR_ALERTS",
            resource: "ALERTS_DATABASE",
            details: `${user.name} permanently cleared all safety alerts from the system database.`
          });
        }
        toast.success("Alert history cleared successfully");
      }
    } catch (err) {
      console.error("Failed to clear alerts:", err);
      toast.error("Failed to connect to backend to clear alerts");
    }
  };

  const filteredAlerts = notifications
    .filter(n => n.type !== "system")
    .filter(n => filter === "all" || n.severity === filter)
    .filter(n => 
      n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.description.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight text-foreground">Traffic Incidents</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Real-time Safety Alert Log</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="font-mono text-[10px] h-8 gap-1.5 border-border/50"
            onClick={handleMarkAllRead}
            disabled={isEmergencyResponder}
          >
            <CheckCheck className="h-3.5 w-3.5" /> MARK ALL READ
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="font-mono text-[10px] h-8 gap-1.5"
            onClick={handleClearAll}
            disabled={isEmergencyResponder}
          >
            <Trash2 className="h-3.5 w-3.5" /> CLEAR ALL
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search incidents..."
              className="pl-9 font-mono text-xs bg-secondary/50 border-none h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-border/50">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "ALL EVENTS", count: notifications.filter(n => n.type !== "system").length },
            { id: "critical", label: "CRITICAL", count: notifications.filter(n => n.severity === "critical").length },
            { id: "high", label: "HIGH", count: notifications.filter(n => n.severity === "high").length },
            { id: "medium", label: "MEDIUM", count: notifications.filter(n => n.severity === "medium").length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold whitespace-nowrap transition-all border ${
                filter === f.id 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="grid gap-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-panel border-l-4 p-4 transition-all hover:bg-secondary/20 ${
                alert.severity === "critical" ? "border-l-destructive" :
                alert.severity === "high" ? "border-l-warning" : "border-l-primary"
              } ${!alert.read ? "bg-primary/5" : ""}`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className={`p-2 rounded-lg shrink-0 ${
                  alert.severity === "critical" ? "bg-destructive/10" :
                  alert.severity === "high" ? "bg-warning/10" : "bg-primary/10"
                }`}>
                  <ShieldAlert className={`h-5 w-5 ${
                    alert.severity === "critical" ? "text-destructive" :
                    alert.severity === "high" ? "text-warning" : "text-primary"
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold font-mono text-sm tracking-tight uppercase">{alert.title}</h3>
                    {!alert.read && <Badge className="bg-primary text-[8px] h-3.5 font-mono px-1">NEW</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">{alert.description}</p>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 shrink-0 border-t md:border-t-0 border-border/50 pt-3 md:pt-0">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] font-mono">{alert.time}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono border-border/50">
                    ID: {alert.id.split('-')[0].toUpperCase()}
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 glass-panel border-dashed">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest">No active traffic alerts</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
