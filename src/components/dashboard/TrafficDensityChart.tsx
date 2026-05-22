import { useTheme } from "@/components/ThemeProvider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TrafficDensityChart = ({ data = [] }: { data?: any[] }) => {
  const { theme } = useTheme();

  // Use real data if provided, otherwise show empty or skeleton
  const displayData = data.length > 0 ? data : [
    { time: "00:00", value: 0 },
    { time: "01:00", value: 0 }
  ];

  const gridColor = theme === "dark" ? "hsl(220, 15%, 18%)" : "hsl(210, 15%, 85%)";
  const tickColor = theme === "dark" ? "hsl(215, 15%, 50%)" : "hsl(215, 15%, 45%)";
  const tooltipBg = theme === "dark" ? "hsl(220, 18%, 10%)" : "hsl(0, 0%, 100%)";
  const tooltipBorder = theme === "dark" ? "hsl(220, 15%, 18%)" : "hsl(210, 15%, 85%)";

  return (
    <div className="glass-panel p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Traffic Density</h3>
        <span className="text-[10px] font-mono text-primary animate-pulse uppercase tracking-widest">Live Flow</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={displayData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(185, 70%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(185, 70%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 9, fill: tickColor, fontFamily: 'JetBrains Mono' }} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            tick={{ fontSize: 9, fill: tickColor, fontFamily: 'JetBrains Mono' }} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: "8px",
              fontSize: 10,
              fontFamily: "JetBrains Mono",
              color: theme === "dark" ? "hsl(200, 20%, 90%)" : "hsl(220, 20%, 15%)",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(185, 70%, 50%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrafficDensityChart;
