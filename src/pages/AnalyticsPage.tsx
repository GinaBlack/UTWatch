import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, FileText, Database } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const AnalyticsPage = () => {
  const { theme } = useTheme();
  const [realStats, setRealStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/metrics');
        const data = await response.json();
        setRealStats(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const gridColor = theme === "dark" ? "hsl(220, 15%, 18%)" : "hsl(210, 15%, 85%)";
  const tickColor = theme === "dark" ? "hsl(215, 15%, 50%)" : "hsl(215, 15%, 45%)";
  const tooltipBg = theme === "dark" ? "hsl(220, 18%, 10%)" : "hsl(0, 0%, 100%)";
  const tooltipBorder = theme === "dark" ? "hsl(220, 15%, 18%)" : "hsl(210, 15%, 85%)";
  const tooltipColor = theme === "dark" ? "hsl(200, 20%, 90%)" : "hsl(220, 20%, 15%)";
  const tooltipStyle = { backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "8px", fontSize: 11, fontFamily: "JetBrains Mono", color: tooltipColor };

  const incidentTypes = useMemo(() => {
    if (!realStats) return [];
    return [
      { name: "Vehicles", value: realStats.total_vehicles, color: "hsl(185, 70%, 50%)" },
      { name: "Persons", value: realStats.total_persons, color: "hsl(142, 60%, 45%)" },
      { name: "Incidents", value: realStats.total_accidents, color: "hsl(0, 72%, 55%)" },
    ];
  }, [realStats]);

  if (isLoading) return <div className="p-20 text-center font-mono animate-pulse">Initializing Analytics Engine...</div>;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="glass-panel px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-bold font-mono tracking-wider text-foreground">LIVE ANALYTICS ENGINE</h1>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary/50 px-2 py-1 rounded">
          Session Uptime: {realStats?.uptime || "0:00:00"}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Vehicles", value: realStats?.total_vehicles.toLocaleString(), icon: TrendingUp, color: "text-primary" },
          { label: "Detected Incidents", value: realStats?.total_accidents.toString(), icon: TrendingDown, color: "text-destructive" },
          { label: "Active Nodes", value: realStats?.active_cameras.toString(), icon: BarChart3, color: "text-warning" },
          { label: "Pedestrians", value: realStats?.total_persons.toLocaleString(), icon: FileText, color: "text-success" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold font-mono text-foreground mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Real-time Density Trend */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Real-time Traffic Density</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={realStats?.density_history || []}>
              <defs>
                <linearGradient id="analyticsDensity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(185, 70%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(185, 70%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: tickColor }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: tickColor }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="hsl(185, 70%, 50%)" fill="url(#analyticsDensity)" strokeWidth={2} name="Total Objects" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Object Distribution */}
        <div className="glass-panel p-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Object Class Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={incidentTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                  {incidentTypes.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {incidentTypes.map(type => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                    <span className="text-xs text-foreground font-mono">{type.name}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{type.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown per Camera */}
        <div className="glass-panel p-4 lg:col-span-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Node Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(realStats?.camera_breakdown || {}).map(([camId, counts]: [string, any]) => (
              <div key={camId} className="bg-secondary/30 p-3 rounded-lg border border-border/50">
                <p className="text-[10px] font-bold font-mono text-primary mb-2 border-b border-primary/20 pb-1">{camId}</p>
                <div className="space-y-1">
                  {Object.entries(counts).map(([cls, count]) => (
                    <div key={cls} className="flex justify-between text-[9px] font-mono uppercase">
                      <span className="text-muted-foreground">{cls}</span>
                      <span className="text-foreground">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
