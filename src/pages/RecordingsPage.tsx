import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, 
  Calendar, 
  Clock, 
  HardDrive, 
  Play, 
  Search, 
  Filter, 
  X, 
  Download, 
  Maximize2,
  AlertCircle,
  RefreshCw,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Recording {
  filename: string;
  camera_id: string;
  timestamp: string;
  size_mb: number;
  duration_sec: number;
  created_at: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const RecordingsPage = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState<Recording | null>(null);

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/recordings`);
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings);
      } else {
        toast.error("Failed to fetch recordings");
      }
    } catch (err) {
      console.error("Error fetching recordings:", err);
      toast.error("Connection error to backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const filteredRecordings = recordings.filter(rec => 
    (rec.camera_id.toLowerCase().includes(search.toLowerCase()) || 
     rec.filename.toLowerCase().includes(search.toLowerCase())) &&
    (filter === "all" || rec.camera_id === filter)
  );

  const uniqueCameras = Array.from(new Set(recordings.map(r => r.camera_id)));

  const handleDownload = (filename: string) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const url = `${backendUrl}/api/recordings/${filename}`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight">Recorded Feeds</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Archived camera streams & event footage</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="font-mono text-[10px] h-8 gap-2"
          onClick={fetchRecordings}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> REFRESH DATABASE
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by camera or filename..."
            className="pl-9 font-mono text-xs bg-secondary/50 border-none h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="font-mono text-[10px] h-8 whitespace-nowrap"
            onClick={() => setFilter("all")}
          >
            ALL NODES
          </Button>
          {uniqueCameras.map(cam => (
            <Button
              key={cam}
              variant={filter === cam ? "default" : "outline"}
              size="sm"
              className="font-mono text-[10px] h-8 whitespace-nowrap"
              onClick={() => setFilter(cam)}
            >
              {cam}
            </Button>
          ))}
        </div>
      </div>

      {/* Recordings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-48 rounded-lg bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : filteredRecordings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecordings.map((rec, index) => (
            <motion.div
              key={rec.filename}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setSelectedVideo(rec)}
              >
                <div className="aspect-video bg-secondary/50 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <Button size="sm" className="w-full h-8 gap-2 font-mono text-[10px] uppercase">
                      <Play className="h-3 w-3 fill-current" /> PLAY ARCHIVE
                    </Button>
                  </div>
                  <Video className="h-10 w-10 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-md border-none text-[8px] font-mono py-0 px-1.5 h-4">
                      {rec.size_mb} MB
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-bold font-mono text-xs truncate" title={rec.filename}>{rec.filename}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Camera className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{rec.camera_id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-[9px] font-mono">{rec.created_at.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-[9px] font-mono">{formatDuration(rec.duration_sec)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 glass-panel border-dashed">
          <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest">No recordings found in archive</p>
          <Button variant="link" className="mt-2 text-xs font-mono" onClick={fetchRecordings}>RESCAN STORAGE</Button>
        </div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-5xl bg-background rounded-xl overflow-hidden shadow-2xl border border-border/50 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold font-mono text-sm uppercase">{selectedVideo.filename}</h2>
                    <p className="text-[10px] font-mono text-muted-foreground">Node: {selectedVideo.camera_id} • Recorded: {selectedVideo.created_at} • Duration: {formatDuration(selectedVideo.duration_sec)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-secondary" 
                    onClick={() => handleDownload(selectedVideo.filename)}
                    title="Download Archive"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors" 
                    onClick={() => setSelectedVideo(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Player Body */}
              <div className="flex-1 bg-black relative flex items-center justify-center min-h-0">
                <video 
                  controls 
                  autoPlay
                  muted
                  className="w-full h-full max-h-full"
                  src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/recordings/${selectedVideo.filename}`}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-secondary/10 flex items-center justify-between border-t border-border/50">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono uppercase text-muted-foreground">Storage Info</span>
                    <span className="text-[10px] font-mono font-bold">{selectedVideo.size_mb} MB Archive</span>
                  </div>
                  <div className="flex flex-col border-l border-border/50 pl-4">
                    <span className="text-[8px] font-mono uppercase text-muted-foreground">Node ID</span>
                    <span className="text-[10px] font-mono font-bold">{selectedVideo.camera_id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-tighter">SECURE ARCHIVE</Badge>
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecordingsPage;
