import { useState, useEffect } from "react";
import { Shield, Bell, Settings, Radio, Sun, Moon } from "lucide-react";
import { useTheme, useAuth } from "@/components/ThemeProvider";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-panel px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          <div>
            <h1 className="text-sm font-bold font-mono tracking-wider text-foreground">URBAN TRAFFIC WATCH</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Real-Time Surveillance & Accident Detection</p>
          </div>
        </div>
        <div className="ml-6 flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/30">
          <Radio className="h-3 w-3 text-success animate-pulse-glow" />
          <span className="text-[10px] font-mono text-success">SYSTEM ONLINE</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md bg-secondary">
            <span className="text-[10px] font-mono text-muted-foreground">Operator:</span>
            <span className="text-[10px] font-mono text-foreground">{user.name}</span>
          </div>
        )}
        <div className="text-right">
          <p className="text-sm font-mono font-bold text-foreground">
            {time.toLocaleTimeString("en-US", { hour12: false })}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/notifications")} className="relative p-2 rounded-md hover:bg-secondary transition-colors">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-secondary transition-colors" title="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => navigate("/settings")} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
