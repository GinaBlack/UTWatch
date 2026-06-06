import { Shield, Sun, Moon, Bell, Settings, Map, BarChart3, Monitor, LogOut, Menu, X, FileText, Video, History, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, Play } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme, useAuth, useNotifications } from "@/components/ThemeProvider";
import { useState } from "react";
import { logSystemAction } from "@/lib/audit";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navLinks = [
  { path: "/dashboard", label: "Dashboard", icon: Monitor, roles: ["Administrator", "Traffic Officer", "Emergency Responder"] },
  { path: "/cameras", label: "Cameras", icon: Video, roles: ["Administrator", "Traffic Officer", "Emergency Responder"] },
  { path: "/recordings", label: "Recordings", icon: Play, roles: ["Administrator", "Traffic Officer"] },
  { path: "/map", label: "Map View", icon: Map, roles: ["Administrator", "Traffic Officer", "Emergency Responder"] },
  { path: "/analytics", label: "Analytics", icon: BarChart3, roles: ["Administrator", "Traffic Officer"] },
  { path: "/reports", label: "Reports", icon: FileText, roles: ["Administrator", "Traffic Officer"] },
  { path: "/logs", label: "Audit Trail", icon: History, roles: ["Administrator"] },
  { path: "/alerts", label: "Alerts", icon: AlertTriangle, roles: ["Administrator", "Traffic Officer", "Emergency Responder"] },
  { path: "/notifications", label: "Notifications", icon: Bell, roles: ["Administrator", "Traffic Officer", "Emergency Responder"] },
  { path: "/users", label: "User Management", icon: ShieldCheck, roles: ["Administrator"] },
  { path: "/settings", label: "System Config", icon: Settings, roles: ["Administrator"] },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredLinks = navLinks.filter(link => user && link.roles.includes(user.role));

  const handleLogout = async () => {
    if (user) {
      await logSystemAction({
        userId: user.uid,
        userName: user.name,
        userRole: user.role,
        action: "LOGOUT",
        resource: "AUTH",
        details: `User ${user.name} logged out of the system.`
      });
    }
    await logout();
    navigate("/auth");
  };

  return (
    <div className="h-screen bg-background flex p-3 gap-3 overflow-hidden">
      {/* Sidebar - Desktop & Tablet */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? "w-20" : "w-52"} glass-panel shrink-0 transition-all duration-300 relative`}>
        <div className={`p-6 flex items-center ${isCollapsed ? "justify-center" : "gap-1"} border-b border-border/50`}>
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain  shrink-0" />
          {!isCollapsed && (
            <span className="font-mono font-bold text-sm tracking-wider text-foreground truncate">
              UT WATCH
            </span>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-10 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background shadow-lg z-50 hover:scale-110 transition-transform"
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
          {filteredLinks.map(link => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                title={isCollapsed ? link.label : ""}
                className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-4"} py-3 rounded-md text-xs font-mono transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 glow-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <link.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {!isCollapsed && <span className="truncate">{link.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          {user && !isCollapsed && (
            <div className="px-4 py-2 mb-2 rounded bg-secondary/50 border border-border/30">
              <p className="text-[8px] font-mono text-primary uppercase tracking-tighter mb-0.5">{user.role}</p>
              <p className="text-xs font-mono font-bold truncate">{user.name || user.email}</p>
            </div>
          )}
          <button 
            onClick={handleLogout} 
            title={isCollapsed ? "Logout" : ""}
            className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-4"} py-3 rounded-md text-xs font-mono text-destructive hover:bg-destructive/10 transition-colors`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]"
          onClick={() => setMobileOpen(false)}
        >
          <div 
            className="w-64 h-full glass-panel flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
                <span className="font-mono font-bold text-xs tracking-wider">UT WATCH</span>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => { navigate(link.path); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-mono transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border/50">
              <button 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-mono text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Header */}
        <header className="glass-panel h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileOpen(true)} 
              className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <h2 className="font-mono-display font-bold text-sm tracking-widest hidden sm:block uppercase opacity-50">
              {navLinks.find(l => l.path === location.pathname)?.label || "Urban Traffic Watch"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/notifications")} 
              className="relative p-2 rounded-md hover:bg-secondary transition-colors" 
              title="Open alerts"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-mono flex items-center justify-center border-2 border-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-md hover:bg-secondary transition-colors" 
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>

        {/* Footer */}
        <footer className="glass-panel px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-4 w-4 object-contain" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Urban Traffic Watch © 2026</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">System Operational</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground opacity-50 uppercase tracking-widest">v2.1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
