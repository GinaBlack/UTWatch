import { useState, useEffect } from "react";
import { Car, AlertTriangle, Camera, Gauge, LayoutGrid, Square, MonitorPlay } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import TrafficDensityChart from "../components/dashboard/TrafficDensityChart";
import VehicleDetectionChart from "../components/dashboard/VehicleDetectionChart";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import SystemStatus from "../components/dashboard/SystemStatus";
import AlertToastSystem from "../components/dashboard/AlertToastSystem";
import LiveVideoFeed from "../components/dashboard/LiveVideoFeed";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "react-router-dom";
import socketService from "../services/socket";

const cameras = [
  { 
    cameraId: "CAM-NW-01", 
    location: "Main St & 5th Ave", 
    status: "active" as const, 
    videoSrc: "/videos/Bellevue_150th_Eastgate__2017-09-11_17-08-33.mp4"   
  },
  { 
    cameraId: "CAM-NW-02", 
    location: "Main St & 5th Ave", 
    status: "active" as const, 
    videoSrc: "/videos/trim 1 canada accidents.mp4"   
  }
];

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [selectedCameraId, setSelectedCameraId] = useState(cameras[0].cameraId);
  const [realStats, setRealStats] = useState<any>({
    total_vehicles: 0,
    total_accidents: 0,
    active_cameras: 0,
    uptime: "0:00:00",
    density_history: [],
    detection_history: []
  });

  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    socket.on('stats_update', (stats: any) => {
      setRealStats(stats);
    });

    return () => {
      socket.off('stats_update');
    };
  }, []);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const camParam = searchParams.get("cam");

    if (viewParam === "single") setViewMode("single");
    if (camParam && cameras.find(c => c.cameraId === camParam)) setSelectedCameraId(camParam);
  }, [searchParams]);

  const activeCamera = cameras.find(c => c.cameraId === selectedCameraId) || cameras[0];

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

        {viewMode === "single" && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Source:</span>
            <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
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
        <StatCard title="Active Nodes" value={realStats.active_cameras.toString()} change={`Up: ${realStats.uptime}`} changeType="neutral" icon={Camera} glowColor="primary" />
        <StatCard title="Vehicles (Live)" value={realStats.total_vehicles.toLocaleString()} change="Total processed" changeType="positive" icon={Car} />
        <StatCard title="Avg Density" value={`${realStats.total_vehicles > 0 ? Math.min(100, Math.floor(realStats.total_vehicles / 10)) : 0}%`} change="Current flow" changeType="neutral" icon={Gauge} glowColor="warning" />
        <StatCard title="Incidents Logged" value={realStats.total_accidents.toString()} change="Critical events" changeType="negative" icon={AlertTriangle} glowColor="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cameras.map(cam => (
                <LiveVideoFeed key={cam.cameraId} {...cam} />
              ))}
            </div>
          ) : (
            <div className="w-full aspect-video">
              <LiveVideoFeed {...activeCamera} />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TrafficDensityChart data={realStats.density_history} />
            <VehicleDetectionChart data={realStats.detection_history} />
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