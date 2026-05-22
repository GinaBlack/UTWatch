import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, Clock, CheckCheck, Info, Settings, ShieldCheck } from "lucide-react";
import { useNotifications } from "@/components/ThemeProvider";

const systemIcons = { system: Bell, update: Settings, maintenance: ShieldCheck, info: Info };
const severityColors = { critical: "text-destructive", high: "text-warning", medium: "text-primary", info: "text-muted-foreground" };

const NotificationsPage = () => {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { notifications, markNotificationRead, markAllNotificationsRead } = useNotifications();

  // Filter for system updates (Notifications)
  const notificationsOnly = notifications.filter(n => n.type === "system");
  const filtered = filter === "unread" ? notificationsOnly.filter(n => !n.read) : notificationsOnly;
  const unreadCount = notificationsOnly.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="glass-panel px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-wider text-foreground">SYSTEM NOTIFICATIONS</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase">System Changes and Updates</p>
          </div>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-bold">
              {unreadCount} NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
            <button onClick={() => setFilter("all")} className={`px-4 py-1.5 rounded text-[10px] font-mono transition-all ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>ALL</button>
            <button onClick={() => setFilter("unread")} className={`px-4 py-1.5 rounded text-[10px] font-mono transition-all ${filter === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>UNREAD</button>
          </div>
          <button onClick={markAllNotificationsRead} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-mono hover:bg-secondary/80 transition-all border border-border/50">
            <CheckCheck className="h-3.5 w-3.5" /> MARK ALL READ
          </button>
        </div>
      </div>

      <div className="space-y-3 max-w-4xl mx-auto">
        {filtered.length > 0 ? (
          filtered.map((notification, i) => {
            return (
              <motion.div 
                key={notification.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.05 }}
                onClick={() => markNotificationRead(notification.id)}
                className={`glass-panel p-5 cursor-pointer hover:border-primary/30 transition-all ${!notification.read ? "border-l-2 border-l-primary bg-primary/5" : "opacity-75"}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-full bg-secondary p-2.5 ${severityColors[notification.severity]}`}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-bold font-mono ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {notification.time}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-mono italic">
                      {notification.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="glass-panel p-16 text-center">
            <ShieldCheck className="h-10 w-10 text-success/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest">System is up to date</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
