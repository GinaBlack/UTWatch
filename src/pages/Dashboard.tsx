import { useState } from "react";
import { Car, AlertTriangle, Camera as CameraIcon, Gauge, LayoutGrid, Square, MonitorPlay, AlertCircle } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import TrafficDensityChart from "../components/dashboard/TrafficDensityChart";
import VehicleDetectionChart from "../components/dashboard/VehicleDetectionChart";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SystemStatus from "../components/dashboard/SystemStatus";
import AlertToastSystem from "../components/dashboard/AlertToastSystem";
import LiveVideoFeed from "../components/dashboard/LiveVideoFeed";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useVision } from "../components/VisionProvider";

const Dashboard = () => {
  const { cameras, loading } = useVision();
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [selectedCameraId, setSelectedCameraId] = useState("");
  
  // Note: Statistics now come from socket events which are handled by the VisionProvider's internal logic. 
  // For simplicity here, we assume cameras are already active.
  const activeCamera = cameras.find(c => c.cameraId === selectedCameraId) || (cameras.length > 0 ? cameras[0] : null);

  return (
    <div className="space-y-3">
      <AlertToastSystem />
      
      {/* View Selectors */}
      <div className="glass-panel px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Display Mode</span>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
            <TabsList className="bg-secondary/50 h-8 p-1">
              <TabsTrigger value="grid" className="text-[10px] px-3 h-6 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutGrid className="h-3 w-3" /> GRID
              </TabsTrigger>
              <TabsTrigger value="single" className="text-[10px] px-3 h-6 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Square className="h-3 w-3" /> SINGLE
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {viewMode === "single" && cameras.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Source:</span>
            <Select value={selectedCameraId || cameras[0].cameraId} onValueChange={setSelectedCameraId}>
              <SelectTrigger className="w-[200px] h-8 text-[10px] font-mono bg-secondary/50 border-none">
                <SelectValue placeholder="Select Camera" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                {cameras.map(cam => (
                  <SelectItem key={cam.cameraId} value={cam.cameraId} className="text-[10px] font-mono">
                    {cam.cameraId} - {cam.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Active Nodes" value={cameras.length.toString()} change="System Online" changeType="positive" icon={CameraIcon} glowColor="primary" />
        {/* Placeholder stats for demo purposes as we refactored to focus on video continuity */}
        <StatCard title="Vehicles (Live)" value="--" change="Processing..." changeType="neutral" icon={Car} />
        <StatCard title="Avg Density" value="--" change="Processing..." changeType="neutral" icon={Gauge} glowColor="warning" />
        <StatCard title="Incidents Logged" value="--" change="Monitoring..." changeType="neutral" icon={AlertTriangle} glowColor="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-32 glass-panel border-dashed">
              <p className="font-mono text-xs animate-pulse">Syncing with system vision nodes...</p>
            </div>
          ) : cameras.length > 0 ? (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cameras.map(cam => (
                    <LiveVideoFeed key={cam.cameraId} cameraId={cam.cameraId} location={cam.location} status={cam.status} />
                  ))}
                </div>
              ) : (
                <div className="w-full aspect-video">
                  {activeCamera && <LiveVideoFeed cameraId={activeCamera.cameraId} location={activeCamera.location} status={activeCamera.status} />}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 glass-panel border-dashed text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <h3 className="font-mono font-bold text-sm uppercase mb-2">No Active Vision Nodes</h3>
              <p className="text-[10px] font-mono text-muted-foreground uppercase max-w-[280px] mb-6">
                System vision is offline. Please register and activate camera nodes to begin processing.
              </p>
              <Link to="/cameras">
                <Button variant="outline" size="sm" className="font-mono text-[10px] h-8 gap-2">
                  <CameraIcon className="h-3 w-3" /> SETUP CAMERAS
                </Button>
              </Link>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TrafficDensityChart data={[]} />
            <VehicleDetectionChart data={[]} />
          </div>
        </div>

        <div className="space-y-3">
          <AlertsPanel />
          <SystemStatus />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
