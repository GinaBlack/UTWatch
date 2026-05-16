import { useTheme } from "@/components/ThemeProvider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const VehicleDetectionChart = ({ data = [] }: { data?: any[] }) => {
  const { theme } = useTheme();

  // The data now comes from detection_history which has vehicle, person, accident counts
  // We'll show the last 10 entries
  const displayData = data.slice(-10);

  const gridColor = theme === "dark" ? "hsl(220, 15%, 18%)" : "hsl(210, 15%, 85%)";
  const tickColor = theme === "dark" ? "hsl(215, 15%, 50%)" : "hsl(215, 15%, 45%)";
  const tooltipBg = theme === "dark" ? "hsl(220, 18%, 10%)" : "hsl(0, 0%, 100%)";
  const tooltipBorder = theme === "dark" ? "hsl(220, 15%, 18%)" : "hsl(210, 15%, 85%)";

  return (
    <div className="glass-panel p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Object Breakdown</h3>
        <span className="text-[10px] font-mono text-primary animate-pulse uppercase tracking-widest">Real-time</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: tickColor, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: tickColor, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
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
          <Bar dataKey="vehicle" fill="hsl(185, 70%, 50%)" radius={[4, 4, 0, 0]} name="Vehicles" />
          <Bar dataKey="person" fill="hsl(142, 70%, 50%)" radius={[4, 4, 0, 0]} name="Persons" />
          <Bar dataKey="accident" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} name="Incidents" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VehicleDetectionChart;
