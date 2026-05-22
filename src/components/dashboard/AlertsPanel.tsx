import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Car, ShieldAlert, Clock } from "lucide-react";
import { useNotifications } from "@/components/ThemeProvider";

const severityStyles = {
  critical: "border-destructive/50 bg-destructive/5",
  high: "border-warning/50 bg-warning/5",
  medium: "border-primary/30 bg-primary/5",
  info: "border-muted/30 bg-muted/5",
};

const severityBadge = {
  critical: "bg-destructive/20 text-destructive",
  high: "bg-warning/20 text-warning",
  medium: "bg-primary/20 text-primary",
  info: "bg-muted/20 text-muted-foreground",
};

const typeIcons = {
  accident: ShieldAlert,
  congestion: Car,
  violation: AlertTriangle,
  system: AlertTriangle,
};

const AlertsPanel = () => {
  const { notifications } = useNotifications();

  // Filter for non-system notifications and show only the most recent ones
  const trafficAlerts = notifications
    .filter(n => n.type !== "system")
    .slice(0, 10);

  const criticalCount = trafficAlerts.filter(a => a.severity === "critical").length;

  return (
    <div className="glass-panel p-4 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Active Alerts</h3>
        {criticalCount > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-destructive/20 text-destructive animate-pulse-glow">
            {criticalCount} CRITICAL
          </span>
        )}
      </div>
      <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        <AnimatePresence mode="popLayout" initial={false}>
          {trafficAlerts.length > 0 ? (
            trafficAlerts.map(alert => {
              const Icon = typeIcons[alert.type] || AlertTriangle;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  className={`rounded-md border p-3 ${severityStyles[alert.severity]}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 ${
                      alert.severity === "critical" ? "text-destructive" : 
                      alert.severity === "high" ? "text-warning" : "text-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground truncate uppercase font-mono tracking-tight">
                          {alert.title}
                        </p>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${severityBadge[alert.severity]}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono leading-tight">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[9px] font-mono text-muted-foreground/60 tracking-wider">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-10">
              <ShieldAlert className="h-8 w-8 mb-2" />
              <p className="text-[10px] font-mono uppercase">No Active Traffic Alerts</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AlertsPanel;
