import { useState, useRef, useEffect } from "react";
import { Video, Plus, Settings, Power, Trash2, CheckCircle2, AlertCircle, Camera as CameraIcon, Link, FileVideo, MapPin, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/firebase/firebase_config";
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, serverTimestamp } from "firebase/firestore";
import { logSystemAction } from "@/lib/audit";
import { useAuth } from "@/components/ThemeProvider";

// Declare Leaflet global
declare const L: any;

interface Camera {
  id: string;
  name: string;
  status: "active" | "offline";
  type: "webcam" | "video" | "rtsp";
  source: string; 
  location: string;
  lat?: number;
  lng?: number;
}

const CamerasPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Form State
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newType, setNewType] = useState<"webcam" | "video" | "rtsp">("video");
  const [newSource, setNewSource] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const q = query(collection(db, "cameras"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camsData: Camera[] = [];
      snapshot.forEach((doc) => {
        camsData.push({ id: doc.id, ...doc.data() } as Camera);
      });
      setCameras(camsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize Map for Picking Location
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const checkLeaflet = setInterval(() => {
      if (typeof L !== 'undefined') {
        clearInterval(checkLeaflet);
        mapRef.current = L.map(mapContainerRef.current, {
          center: [40.7128, -74.0060],
          zoom: 13,
          zoomControl: false,
          attributionControl: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

        mapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setCoordinates({ lat, lng });
          
          if (markerRef.current) {
            markerRef.current.setLatLng(e.latlng);
          } else {
            markerRef.current = L.marker(e.latlng, {
              icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #0ea5e9; border: 2px solid white; width: 20px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; items-center; justify-content: center; box-shadow: 0 0 10px rgba(14,165,233,0.5);"></div>`,
                iconSize: [20, 24],
                iconAnchor: [10, 24]
              })
            }).addTo(mapRef.current);
          }
        });
      }
    }, 100);

    return () => {
      clearInterval(checkLeaflet);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleStatus = async (camera: Camera) => {
    try {
      const newStatus = camera.status === "active" ? "offline" : "active";
      await updateDoc(doc(db, "cameras", camera.id), {
        status: newStatus
      });

      if (user) {
        await logSystemAction({
          userId: user.uid,
          userName: user.name,
          userRole: user.role,
          action: "CAMERA_TOGGLE_STATUS",
          resource: `CAMERA:${camera.id}`,
          details: `Camera '${camera.name}' (${camera.id}) set to ${newStatus} by ${user.name}.`
        });
      }

      toast({
        title: `Camera ${newStatus === 'active' ? 'Started' : 'Halted'}`,
        description: `${camera.name} is now ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update camera status.",
        variant: "destructive",
      });
    }
  };

  const deleteCamera = async (camera: Camera) => {
    try {
      await deleteDoc(doc(db, "cameras", camera.id));

      if (user) {
        await logSystemAction({
          userId: user.uid,
          userName: user.name,
          userRole: user.role,
          action: "CAMERA_DELETE",
          resource: `CAMERA:${camera.id}`,
          details: `Camera node '${camera.name}' (${camera.id}) was permanently unregistered by ${user.name}.`
        });
      }

      toast({
        title: "Camera Removed",
        description: `${camera.name} has been disconnected from the system.`,
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove camera.",
        variant: "destructive",
      });
    }
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSource) {
      toast({
        title: "Error",
        description: "Please provide a name and source.",
        variant: "destructive",
      });
      return;
    }

    if (!coordinates) {
      toast({
        title: "Location Required",
        description: "Please select camera location on the map.",
        variant: "destructive",
      });
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "cameras"), {
        name: newName,
        location: newLocation || "Unknown Location",
        type: newType,
        source: newSource,
        status: "active",
        lat: coordinates.lat,
        lng: coordinates.lng,
        createdAt: serverTimestamp()
      });

      if (user) {
        await logSystemAction({
          userId: user.uid,
          userName: user.name,
          userRole: user.role,
          action: "CAMERA_ADD",
          resource: `CAMERA:${docRef.id}`,
          details: `New camera node '${newName}' initialized at source '${newSource}' by ${user.name}.`
        });
      }

      setNewName("");
      setNewLocation("");
      setNewSource("");
      setNewType("video");
      setCoordinates(null);
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      
      toast({
        title: "Success",
        description: `New camera node initialized and connected successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add camera node.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real local app, we might need the full path, but browsers don't give it.
      // We'll assume files are in /videos/ if only the name is picked, or use the file name.
      setNewSource(`/videos/${file.name}`);
      toast({
        title: "Video Selected",
        description: `Path set to /videos/${file.name}. Ensure the file exists in the backend recordings or public/videos folder.`,
      });
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'webcam': return <CameraIcon className="h-4 w-4" />;
      case 'rtsp': return <Link className="h-4 w-4" />;
      case 'video': return <FileVideo className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
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

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="font-mono text-sm animate-pulse">Loading camera network...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <Card key={camera.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary/30">
                <div className="flex flex-col">
                  <CardTitle className="text-sm font-bold font-mono tracking-tight">{camera.name}</CardTitle>
                  <span className="text-[10px] font-mono text-muted-foreground">{camera.location}</span>
                </div>
                <div className={`p-2 rounded-full ${camera.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {getSourceIcon(camera.type)}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-muted-foreground uppercase">Type</span>
                    <span className="text-foreground font-bold uppercase">{camera.type}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-muted-foreground uppercase">Source</span>
                    <span className="text-foreground truncate max-w-[120px]" title={camera.source}>{camera.source}</span>
                  </div>

                  {camera.lat && (
                    <div className="flex justify-between items-center text-[8px] font-mono opacity-60">
                      <span className="uppercase flex items-center gap-1"><MapPin className="h-2 w-2" /> Coordinates</span>
                      <span>{camera.lat.toFixed(4)}, {camera.lng?.toFixed(4)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 py-2 border-y border-border/50">
                    <div className={`h-1.5 w-1.5 rounded-full ${camera.status === 'active' ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
                    <span className={`text-[10px] font-bold font-mono uppercase ${camera.status === 'active' ? 'text-success' : 'text-destructive'}`}>
                      {camera.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-2 font-mono text-[10px] hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => toast({ title: "Info", description: "Advanced configuration coming soon." })}
                    >
                      <Settings className="h-3 w-3" />
                      CONFIG
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`h-8 gap-2 font-mono text-[10px] transition-colors ${camera.status === 'active' ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-success/10 hover:text-success'}`}
                      onClick={() => toggleStatus(camera)}
                    >
                      <Power className="h-3 w-3" />
                      {camera.status === 'active' ? 'HALT' : 'START'}
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-8 gap-2 font-mono text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    onClick={() => deleteCamera(camera)}
                  >
                    <Trash2 className="h-3 w-3" />
                    UNREGISTER NODE
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {cameras.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 glass-panel border-dashed">
              <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-mono text-muted-foreground uppercase">No cameras registered</p>
            </div>
          )}
        </div>
      )}

      <div ref={formRef}>
        <Card className="border-border/50 bg-card/30 overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-secondary/20">
            <CardTitle className="text-lg font-bold font-mono uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Initialize New Node
            </CardTitle>
            <CardDescription className="text-[10px] font-mono uppercase">Register a new computer vision source to the network</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <form onSubmit={handleAddCamera} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="camera-name" className="text-[10px] font-mono uppercase text-muted-foreground">Node Identifier (Name)</Label>
                  <Input 
                    id="camera-name" 
                    placeholder="e.g. West Gate Terminal" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-secondary/50 border-none font-mono text-xs h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camera-location" className="text-[10px] font-mono uppercase text-muted-foreground">Location Description</Label>
                  <Input 
                    id="camera-location" 
                    placeholder="e.g. 5th Ave Intersection" 
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="bg-secondary/50 border-none font-mono text-xs h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="camera-type" className="text-[10px] font-mono uppercase text-muted-foreground">Source Type</Label>
                    <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                      <SelectTrigger className="bg-secondary/50 border-none font-mono text-xs h-10">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webcam" className="font-mono text-xs">Webcam</SelectItem>
                        <SelectItem value="video" className="font-mono text-xs">Video File</SelectItem>
                        <SelectItem value="rtsp" className="font-mono text-xs">RTSP Stream</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono uppercase text-muted-foreground">Coordinates</Label>
                    <div className="h-10 px-3 flex items-center bg-secondary/50 rounded-md font-mono text-[10px] text-muted-foreground">
                      {coordinates ? `${coordinates.lat.toFixed(3)}, ${coordinates.lng.toFixed(3)}` : "Click on map →"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="camera-source" className="text-[10px] font-mono uppercase text-muted-foreground flex justify-between">
                    <span>{newType === 'webcam' ? 'Webcam Index' : newType === 'video' ? 'Video Path' : 'RTSP URL'}</span>
                    {newType === 'video' && (
                      <label className="cursor-pointer text-primary hover:underline flex items-center gap-1">
                        <FileVideo className="h-3 w-3" /> Browse File
                        <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                      </label>
                    )}
                  </Label>
                  <Input 
                    id="camera-source" 
                    placeholder={newType === 'webcam' ? '0' : newType === 'video' ? '/videos/clip.mp4' : 'rtsp://...'} 
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="bg-secondary/50 border-none font-mono text-xs h-10"
                  />
                </div>
                
                <Button type="submit" className="w-full font-mono text-xs uppercase tracking-widest py-6 shadow-lg shadow-primary/20 mt-4">
                  Connect & Initialize Node
                </Button>
              </form>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-2">
                  <MapIcon className="h-3 w-3" /> Select Camera Position on Map
                </Label>
                <div className="flex-1 min-h-[300px] glass-panel relative overflow-hidden rounded-lg">
                  <div ref={mapContainerRef} className="w-full h-full z-10" />
                  {!coordinates && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-primary animate-bounce" />
                        <span className="text-[9px] font-mono text-white uppercase tracking-tighter">Click map to set anchor point</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CamerasPage;
