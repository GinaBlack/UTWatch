import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Circle, Maximize2 } from "lucide-react";

interface VideoFeedProps {
  cameraId: string;
  location: string;
  status: "active" | "alert" | "offline";
  vehicleCount: number;
}

const VideoFeed = ({ cameraId, location, status, vehicleCount }: VideoFeedProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = status === "alert" ? "text-destructive" : status === "active" ? "text-success" : "text-muted-foreground";
  const borderClass = status === "alert" ? "border-destructive/50 glow-danger" : "border-border/50";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-panel overflow-hidden ${borderClass}`}
    >
      {/* Simulated video area */}
      <div className="relative aspect-video bg-secondary/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground font-mono">LIVE FEED — {cameraId}</p>
          </div>
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-0 pointer-events-none scan-line" />

        {/* Detection overlay boxes */}
        {status === "active" && (
          <>
            <div className="absolute top-[20%] left-[15%] w-16 h-10 border border-primary/60 rounded-sm" />
            <div className="absolute top-[35%] left-[55%] w-14 h-9 border border-primary/60 rounded-sm" />
            <div className="absolute top-[50%] left-[30%] w-18 h-11 border border-primary/60 rounded-sm" />
          </>
        )}
        {status === "alert" && (
          <div className="absolute top-[30%] left-[40%] w-20 h-12 border-2 border-destructive rounded-sm animate-pulse-glow" />
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-background/70">
          <div className="flex items-center gap-1.5">
            <Circle className={`h-2 w-2 fill-current ${statusColor} ${status === "alert" ? "animate-pulse-glow" : ""}`} />
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{status}</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {time.toLocaleTimeString()}
          </span>
        </div>

        <button className="absolute bottom-2 right-2 p-1 rounded bg-background/50 hover:bg-background/80 transition-colors">
          <Maximize2 className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Info bar */}
      <div className="p-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-foreground">{location}</p>
          <p className="text-[10px] font-mono text-muted-foreground">{cameraId}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold font-mono text-primary">{vehicleCount}</p>
          <p className="text-[10px] text-muted-foreground">vehicles</p>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoFeed;
