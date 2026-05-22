import { useState, useEffect } from "react";
import { Cpu, HardDrive, Wifi, Activity } from "lucide-react";

const SystemStatus = () => {
  const [stats, setStats] = useState({ cpu: 42, memory: 67, network: 98, fps: 30 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        cpu: Math.min(100, Math.max(20, 42 + Math.floor(Math.random() * 30 - 15))),
        memory: Math.min(100, Math.max(40, 67 + Math.floor(Math.random() * 10 - 5))),
        network: Math.min(100, Math.max(85, 98 + Math.floor(Math.random() * 4 - 2))),
        fps: Math.min(60, Math.max(24, 30 + Math.floor(Math.random() * 6 - 3))),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: "CPU", value: stats.cpu, unit: "%", icon: Cpu, warn: stats.cpu > 80 },
    { label: "MEM", value: stats.memory, unit: "%", icon: HardDrive, warn: stats.memory > 85 },
    { label: "NET", value: stats.network, unit: "%", icon: Wifi, warn: false },
    { label: "FPS", value: stats.fps, unit: "", icon: Activity, warn: stats.fps < 25 },
  ];

  return (
    <div className="glass-panel p-3">
      <h3 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">System Status</h3>
      <div className="grid grid-cols-4 gap-3">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.warn ? "text-warning" : "text-primary"}`} />
            <p className={`text-sm font-bold font-mono ${item.warn ? "text-warning" : "text-foreground"}`}>
              {item.value}{item.unit}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemStatus;
