import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertTriangle, Circle, ZoomIn, ZoomOut, Crosshair, Layers, Navigation, Info, Map as MapIcon, X, MapPin } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase/firebase_config";
import { collection, onSnapshot, query } from "firebase/firestore";

// Declare Leaflet global
declare const L: any;

interface CameraData {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  location: string;
}

const MapViewPage = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState(true);
  const [realMetrics, setRealMetrics] = useState<any>(null);
  const [realAlerts, setRealAlerts] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [showCameras, setShowCameras] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  // Fetch Cameras from Firestore
  useEffect(() => {
    const q = query(collection(db, "cameras"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camsData: CameraData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lat && data.lng) {
          camsData.push({ 
            id: doc.id, 
            name: data.name, 
            status: data.status, 
            lat: data.lat, 
            lng: data.lng,
            location: data.location
          });
        }
      });
      setCameras(camsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Live Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const [mRes, aRes] = await Promise.all([
          fetch(`${backendUrl}/api/metrics`),
          fetch(`${backendUrl}/api/alerts`)
        ]);
        const mData = await mRes.json();
        const aData = await aRes.json();
        setRealMetrics(mData);
        setRealAlerts(aData.alerts);
      } catch (err) {
        console.error("Failed to fetch map data:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const checkLeaflet = setInterval(() => {
      if (typeof L !== 'undefined') {
        clearInterval(checkLeaflet);
        
        // Use first camera or default to New York
        const center: [number, number] = cameras.length > 0 ? [cameras[0].lat, cameras[0].lng] : [40.7128, -74.0060];
        
        mapRef.current = L.map(mapContainerRef.current, {
          center: center,
          zoom: 14,
          zoomControl: false,
          attributionControl: false
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
        updateMarkers();
      }
    }, 100);
    return () => {
      clearInterval(checkLeaflet);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [loading]); // Re-init when cameras load

  // Update Markers
  const updateMarkers = () => {
    if (!mapRef.current) return;
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    if (showCameras) {
      cameras.forEach(cam => {
        const hasAlert = realAlerts.some(a => a.camera_id === cam.id);
        const color = hasAlert ? '#ef4444' : '#0ea5e9';
        
        const marker = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${color}22; border: 2px solid ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; items-center; justify-content: center; box-shadow: 0 0 10px ${color}44;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const m = L.marker([cam.lat, cam.lng], { icon: marker }).addTo(mapRef.current);
        m.on('click', () => { setSelectedCamera(cam.id); setSelectedIncident(null); mapRef.current.setView([cam.lat, cam.lng], 16); });
        markersRef.current[cam.id] = m;
      });
    }

    if (showIncidents) {
      realAlerts.slice(0, 10).forEach((inc, idx) => {
        const cam = cameras.find(c => c.id === inc.camera_id);
        if (!cam) return;

        const offsetLat = (Math.random() - 0.5) * 0.002;
        const offsetLng = (Math.random() - 0.5) * 0.002;
        const color = '#ef4444';
        
        const marker = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${color}22; border: 2px solid ${color}; width: 28px; height: 28px; border-radius: 8px; display: flex; items-center; justify-content: center; box-shadow: 0 0 15px ${color}66;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const m = L.marker([cam.lat + offsetLat, cam.lng + offsetLng], { icon: marker }).addTo(mapRef.current);
        m.on('click', () => { setSelectedIncident(idx); setSelectedCamera(null); mapRef.current.setView([cam.lat + offsetLat, cam.lng + offsetLng], 16); });
        markersRef.current[`inc-${idx}`] = m;
      });
    }
  };

  useEffect(() => { updateMarkers(); }, [showCameras, showIncidents, realMetrics, realAlerts, cameras]);

  const selectedCam = cameras.find(c => c.id === selectedCamera);
  const selectedInc = typeof selectedIncident === 'number' ? realAlerts[selectedIncident] : null;

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header Controls */}
      <div className="glass-panel px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold font-mono tracking-widest text-foreground uppercase">City Monitoring Map</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] font-mono text-success uppercase">
                <Circle className="h-1.5 w-1.5 fill-current" /> Live Statistics Enabled
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-secondary/50 p-1 rounded-md border border-border/50">
            <button onClick={() => setShowCameras(!showCameras)} className={`px-3 py-1.5 rounded text-[10px] font-mono transition-all ${showCameras ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}>NODES</button>
            <button onClick={() => setShowIncidents(!showIncidents)} className={`px-3 py-1.5 rounded text-[10px] font-mono transition-all ${showIncidents ? "bg-destructive text-destructive-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}>INCIDENTS</button>
          </div>
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-md border border-border/50">
            <button onClick={() => mapRef.current?.zoomIn()} className="p-1.5 rounded hover:bg-primary/20 transition-colors"><ZoomIn className="h-4 w-4 text-muted-foreground" /></button>
            <button onClick={() => mapRef.current?.zoomOut()} className="p-1.5 rounded hover:bg-primary/20 transition-colors"><ZoomOut className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <button onClick={() => {
            if (cameras.length > 0) mapRef.current?.setView([cameras[0].lat, cameras[0].lng], 14);
          }} className="p-2 bg-secondary/50 rounded-md border border-border/50 hover:bg-primary/10 transition-colors"><Crosshair className="h-4 w-4 text-muted-foreground" /></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-3 glass-panel relative overflow-hidden group bg-background/50">
          {loading ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
               <p className="font-mono text-xs animate-pulse">Loading camera coordinates...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm text-center p-6">
              <AlertCircle className="h-10 w-10 text-muted-foreground/30 mb-4" />
              <h3 className="font-mono font-bold text-sm uppercase mb-2">No Geographic Data</h3>
              <p className="text-[10px] font-mono text-muted-foreground uppercase max-w-[280px]">Please register cameras with map coordinates in the Camera Management section.</p>
            </div>
          ) : null}
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <AnimatePresence mode="wait">
            {selectedCam ? (
              <motion.div key={selectedCam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-panel p-5 border-l-4 border-l-primary">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h3 className="text-sm font-bold font-mono text-foreground">{selectedCam.name}</h3></div>
                  <button onClick={() => setSelectedCamera(null)}><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-secondary/50 rounded border border-border/50"><p className="text-[8px] font-mono text-muted-foreground uppercase">Description</p><p className="text-xs font-bold">{selectedCam.location}</p></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-secondary/50 rounded border border-border/50"><p className="text-[8px] font-mono text-muted-foreground uppercase">Vehicles</p><span className="text-xs font-bold font-mono">{realMetrics?.camera_breakdown?.[selectedCam.id]?.vehicle || 0}</span></div>
                    <div className="p-2 bg-secondary/50 rounded border border-border/50"><p className="text-[8px] font-mono text-muted-foreground uppercase">Accidents</p><span className="text-xs font-bold font-mono text-destructive">{realMetrics?.camera_breakdown?.[selectedCam.id]?.accident || 0}</span></div>
                  </div>
                  <button onClick={() => navigate(`/dashboard?view=single&cam=${selectedCam.id}`)} className="w-full mt-2 py-2 bg-primary text-primary-foreground rounded text-[10px] font-mono font-bold uppercase tracking-widest">Open Feed</button>
                </div>
              </motion.div>
            ) : selectedInc ? (
              <motion.div key={selectedInc.timestamp} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-panel p-5 border-l-4 border-l-destructive">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /><h3 className="text-sm font-bold font-mono text-foreground uppercase">Incident</h3></div>
                  <button onClick={() => setSelectedIncident(null)}><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <div className="p-2 bg-destructive/5 rounded border border-destructive/20"><p className="text-[8px] font-mono text-destructive uppercase font-bold tracking-tighter">Event Details</p><p className="text-xs font-mono uppercase">{selectedInc.type.replace(/_/g, ' ')}: {selectedInc.details}</p></div>
                  <div className="p-2 bg-secondary/50 rounded border border-border/50"><p className="text-[8px] font-mono text-muted-foreground uppercase">Source Node</p><p className="text-xs font-bold font-mono">{selectedInc.camera_id}</p></div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-panel p-8 text-center text-muted-foreground uppercase tracking-widest text-[10px]"><Info className="h-8 w-8 mx-auto mb-2 opacity-20" />Select marker for details</div>
            )}
          </AnimatePresence>

          <div className="glass-panel flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-3 border-b border-border/50 bg-secondary/30 flex justify-between items-center"><h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Node Registry</h3><Layers className="h-3 w-3 text-primary opacity-50" /></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {cameras.map(cam => (
                <button key={cam.id} onClick={() => { setSelectedCamera(cam.id); setSelectedIncident(null); mapRef.current?.setView([cam.lat, cam.lng], 16); }} className={`w-full flex items-center justify-between p-2 rounded text-[10px] font-mono ${selectedCamera === cam.id ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"}`}>
                  <span className="font-bold truncate max-w-[100px]">{cam.name}</span>
                  <span className="text-primary">{realMetrics?.camera_breakdown?.[cam.id]?.vehicle || 0} v</span>
                </button>
              ))}
              {cameras.length === 0 && !loading && (
                 <div className="p-4 text-center text-[8px] text-muted-foreground uppercase">No cameras found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewPage;
