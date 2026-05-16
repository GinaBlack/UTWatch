import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  glowColor?: "primary" | "danger" | "warning";
}

const StatCard = ({ title, value, change, changeType = "neutral", icon: Icon, glowColor }: StatCardProps) => {
  const glowClass = glowColor === "danger" ? "glow-danger" : glowColor === "warning" ? "glow-warning" : glowColor === "primary" ? "glow-primary" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-4 ${glowClass}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-mono">{title}</p>
          <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
          {change && (
            <p className={`text-xs font-mono ${changeType === "positive" ? "text-success" : changeType === "negative" ? "text-destructive" : "text-muted-foreground"}`}>
              {change}
            </p>
          )}
        </div>
        <div className="rounded-md bg-secondary p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
