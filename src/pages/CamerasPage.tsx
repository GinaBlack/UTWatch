import { useState, useRef } from "react";
import { Video, Plus, Settings, Power, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Camera {
  id: string;
  name: string;
  status: "Online" | "Offline";
  ip: string;
  streamUrl: string;
}

const INITIAL_CAMERAS: Camera[] = [
  { id: "CAM-01", name: "North Intersection", status: "Online", ip: "192.168.1.101", streamUrl: "rtsp://192.168.1.101/live" },
  { id: "CAM-02", name: "South Bridge", status: "Online", ip: "192.168.1.102", streamUrl: "rtsp://192.168.1.102/live" },
  { id: "CAM-03", name: "East Tunnel", status: "Offline", ip: "192.168.1.103", streamUrl: "rtsp://192.168.1.103/live" },
];

const CamerasPage = () => {
  const { toast } = useToast();
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const formRef = useRef<HTMLDivElement>(null);

  // Form State
  const [newName, setNewName] = useState("");
  const [newIp, setNewIp] = useState("");
  const [newStream, setNewIpStream] = useState("");

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleStatus = (id: string) => {
    setCameras(prev => prev.map(cam => {
      if (cam.id === id) {
        const newStatus = cam.status === "Online" ? "Offline" : "Online";
        toast({
          title: `Camera ${newStatus}`,
          description: `${cam.name} is now ${newStatus.toLowerCase()}.`,
        });
        return { ...cam, status: newStatus };
      }
      return cam;
    }));
  };

  const deleteCamera = (id: string) => {
    const camToDelete = cameras.find(c => c.id === id);
    setCameras(prev => prev.filter(cam => cam.id !== id));
    toast({
      title: "Camera Removed",
      description: `${camToDelete?.name} has been disconnected from the system.`,
      variant: "destructive",
    });
  };

  const handleAddCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newIp) {
      toast({
        title: "Error",
        description: "Please provide a name and IP address.",
        variant: "destructive",
      });
      return;
    }

    const newId = `CAM-0${cameras.length + 1}`;
    const newCamera: Camera = {
      id: newId,
      name: newName,
      ip: newIp,
      streamUrl: newStream || `rtsp://${newIp}/live`,
      status: "Online",
    };

    setCameras(prev => [...prev, newCamera]);
    setNewName("");
    setNewIp("");
    setNewIpStream("");
    
    toast({
      title: "Success",
      description: `Camera ${newId} initialized and connected successfully.`,
    });
  };

  const handleConfigure = (name: string) => {
    toast({
      title: "Configuration",
      description: `Opening advanced parameters for ${name}...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight">Camera Management</h1>
            <p className="text-xs text-muted-foreground font-mono">Control and monitor system vision nodes</p>
          </div>
        </div>
        <Button onClick={scrollToForm} className="gap-2 font-mono text-xs">
          <Plus className="h-4 w-4" />
          ADD NODE
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((camera) => (
          <Card key={camera.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary/30">
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold font-mono tracking-tight">{camera.name}</CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground">{camera.id}</span>
              </div>
              <div className={`p-2 rounded-full ${camera.status === 'Online' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                <Video className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-muted-foreground uppercase">IP Address</span>
                  <span className="text-foreground font-bold">{camera.ip}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-muted-foreground uppercase">Stream URL</span>
                  <span className="text-foreground truncate max-w-[120px]" title={camera.streamUrl}>{camera.streamUrl}</span>
                </div>
                
                <div className="flex items-center gap-2 py-2 border-y border-border/50">
                  <div className={`h-1.5 w-1.5 rounded-full ${camera.status === 'Online' ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                  <span className={`text-[10px] font-bold font-mono uppercase ${camera.status === 'Online' ? 'text-success' : 'text-destructive'}`}>
                    {camera.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 font-mono text-[10px] hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleConfigure(camera.name)}
                  >
                    <Settings className="h-3 w-3" />
                    CONFIG
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-8 gap-2 font-mono text-[10px] transition-colors ${camera.status === 'Online' ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-success/10 hover:text-success'}`}
                    onClick={() => toggleStatus(camera.id)}
                  >
                    <Power className="h-3 w-3" />
                    {camera.status === 'Online' ? 'HALT' : 'START'}
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-8 gap-2 font-mono text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  onClick={() => deleteCamera(camera.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  UNREGISTER NODE
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div ref={formRef}>
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="border-b border-border/50 bg-secondary/20">
            <CardTitle className="text-lg font-bold font-mono uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Initialize New Node
            </CardTitle>
            <CardDescription className="text-[10px] font-mono uppercase">Register a new computer vision source to the network</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleAddCamera} className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="camera-name" className="text-[10px] font-mono uppercase text-muted-foreground">Node Identifier (Name)</Label>
                <Input 
                  id="camera-name" 
                  placeholder="e.g. West Gate Terminal" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-secondary/50 border-none font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camera-ip" className="text-[10px] font-mono uppercase text-muted-foreground">Source IP Address</Label>
                <Input 
                  id="camera-ip" 
                  placeholder="192.168.x.x" 
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="bg-secondary/50 border-none font-mono text-xs"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="camera-type" className="text-[10px] font-mono uppercase text-muted-foreground">RTSP / Stream URL (Optional)</Label>
                <Input 
                  id="camera-type" 
                  placeholder="rtsp://admin:password@192.168.x.x:554/live" 
                  value={newStream}
                  onChange={(e) => setNewIpStream(e.target.value)}
                  className="bg-secondary/50 border-none font-mono text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="w-full font-mono text-xs uppercase tracking-widest py-6 shadow-lg shadow-primary/20">
                  Connect & Initialize Node
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CamerasPage;
