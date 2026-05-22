// src/components/dashboard/LiveVideoFeed.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import socketService from '../../services/socket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Settings2, 
  MonitorPlay, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Gauge,
  Camera,
  Maximize,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

interface LiveVideoFeedProps {
  cameraId: string;
  location: string;
  status: 'active' | 'alert' | 'offline';
  videoSrc: string;
  className?: string;
}

const CLASS_COLORS: Record<string, string> = {
  vehicle: '#3b82f6', // blue-500
  accident: '#ef4444', // red-500
  person: '#10b981',  // emerald-500
  animal: '#f59e0b',  // amber-500
  obstacle: '#8b5cf6', // violet-500
};

const LiveVideoFeed: React.FC<LiveVideoFeedProps> = ({
  cameraId,
  location,
  status,
  videoSrc,
  className,
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stats, setStats] = useState({ vehicle: 0, person: 0, animal: 0, obstacle: 0, accident: 0 });
  const [alert, setAlert] = useState<{ type: string; details: string; videoTime: number; timestamp: number } | null>(null);
  
  // States for Video Playback Features
  const [playbackEnabled, setPlaybackEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Use a ref for detections and sync buffer
  const detectionsRef = useRef<any[]>([]);
  const resultsBuffer = useRef<Map<number, any>>(new Map());
  
  const [visibleClasses, setVisibleClasses] = useState<Record<string, boolean>>({
    vehicle: true,
    person: true,
    animal: true,
    obstacle: true,
    accident: true,
  });

  const [showTracks, setShowTracks] = useState(true); //set to false by default
  
  const isProcessing = useRef(false);
  const lastFrameTime = useRef(0);
  const requestRef = useRef<number>();

  // WebSocket listeners
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    const handleDetectionResult = (data: any) => {
      if (data.camera_id !== cameraId) return;
      
      setStats(data.counts);
      
      if (data.frame_id !== undefined) {
        const fid = Math.round(data.frame_id * 100) / 100;
        resultsBuffer.current.set(fid, data.detections || []);
        
        // Keep buffer lean
        if (resultsBuffer.current.size > 50) {
          const keys = Array.from(resultsBuffer.current.keys()).sort((a, b) => a - b);
          resultsBuffer.current.delete(keys[0]);
        }
      } else {
        detectionsRef.current = data.detections || [];
      }
      
      isProcessing.current = false;
    };

    const handleAccidentAlert = (alertData: any) => {
      if (alertData.camera_id && alertData.camera_id !== cameraId) return;
      
      const alertWithContext = {
        ...alertData,
        videoTime: videoRef.current?.currentTime || 0,
        timestamp: Date.now()
      };
      
      setAlert(alertWithContext);
      setTimeout(() => {
        setAlert(current => (current?.timestamp === alertWithContext.timestamp ? null : current));
      }, 10000);
    };

    socket.on('detection_result', handleDetectionResult);
    socket.on('accident_alert', handleAccidentAlert);

    return () => {
      socket.off('detection_result', handleDetectionResult);
      socket.off('accident_alert', handleAccidentAlert);
    };
  }, [cameraId]);

  // Video loop setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = videoSrc;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.playbackRate = playbackRate;
    
    const onLoadedMetadata = () => setDuration(video.duration);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay failed:', err);
      }
    };
    playVideo();

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    const drawBoxes = (ctx: CanvasRenderingContext2D, detections: any[], canvasWidth: number, canvasHeight: number) => {
      const scaleX = canvasWidth / 640;
      
      detections.forEach(det => {
        if (!visibleClasses[det.class_name]) return;

        const [x1, y1, x2, y2] = det.bbox;
        const color = CLASS_COLORS[det.class_name] || '#ffffff';
        
        const sx1 = x1 * scaleX;
        const sy1 = y1 * scaleX;
        const sw = (x2 - x1) * scaleX;
        const sh = (y2 - y1) * scaleX;

        // Draw Trail (Tracking)
        if (showTracks && det.trail && det.trail.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(det.trail[0][0] * scaleX, det.trail[0][1] * scaleX);
          for (let i = 1; i < det.trail.length; i++) {
            ctx.lineTo(det.trail[i][0] * scaleX, det.trail[i][1] * scaleX);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Bounding Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx1, sy1, sw, sh);

        // Label
        ctx.fillStyle = color;
        const idLabel = showTracks && det.object_id !== undefined ? `ID:${det.object_id} ` : '';
        const label = `${idLabel}${det.class_name} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 10px monospace';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(sx1, sy1 - 15, textWidth + 6, 15);

        ctx.fillStyle = 'white';
        ctx.fillText(label, sx1 + 3, sy1 - 4);
      });
    };

    const sendFrame = () => {
      if (!canvasRef.current || !video || video.ended) {
        requestRef.current = requestAnimationFrame(sendFrame);
        return;
      }
      
      if (video.videoWidth === 0) {
        requestRef.current = requestAnimationFrame(sendFrame);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        
        ctx.save();
        
        // Digital Zoom Logic
        if (zoomLevel > 1) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          ctx.translate(centerX, centerY);
          ctx.scale(zoomLevel, zoomLevel);
          ctx.translate(-centerX, -centerY);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Use synchronized buffer
        let currentDetections = detectionsRef.current;
        const fid = Math.round(video.currentTime * 100) / 100;
        
        if (resultsBuffer.current.has(fid)) {
          currentDetections = resultsBuffer.current.get(fid);
        } else {
          const keys = Array.from(resultsBuffer.current.keys()).filter(k => k <= fid);
          if (keys.length > 0) {
            currentDetections = resultsBuffer.current.get(Math.max(...keys));
          }
        }
        
        drawBoxes(ctx, currentDetections, canvas.width, canvas.height);
        ctx.restore();
      }

      // Only send new frames for processing if not paused
      if (!video.paused && !isProcessing.current) {
        const tempCanvas = offscreenCanvasRef.current!;
        if (tempCanvas.width !== video.videoWidth) tempCanvas.width = video.videoWidth;
        if (tempCanvas.height !== video.videoHeight) tempCanvas.height = video.videoHeight;
        
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
          tempCanvas.toBlob((blob) => {
            if (blob) {
              isProcessing.current = true;
              lastFrameTime.current = Date.now();
              socketService.getSocket()?.emit('frame', { 
                image: blob,
                camera_id: cameraId,
                frame_id: video.currentTime
              });
            }
          }, 'image/jpeg', 0.5);
        }
      }
      
      requestRef.current = requestAnimationFrame(sendFrame);
    };

    requestRef.current = requestAnimationFrame(sendFrame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.pause();
      video.src = '';
    };
  }, [videoSrc, cameraId, visibleClasses, showTracks, zoomLevel, playbackRate]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playbackEnabled) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowRight') {
        stepFrame(1);
      } else if (e.code === 'ArrowLeft') {
        stepFrame(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackEnabled, isPlaying]);

  const toggleClass = (className: string) => {
    setVisibleClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const stepFrame = (direction: number) => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime += direction * (1/30);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const takeSnapshot = useCallback(() => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `snapshot-${cameraId}-${new Date().toISOString()}.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: "Snapshot Captured",
        description: `Frame saved for ${location}`,
      });
    }
  }, [cameraId, location, toast]);

  const toggleFullScreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <Card ref={containerRef} className={cn('overflow-hidden border-border/50 bg-card/30 group', className)}>
      <CardHeader className="pb-2 py-3 bg-secondary/20 border-b border-border/10">
        <CardTitle className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-tight">{location}</span>
            <Badge variant={status === 'alert' ? 'destructive' : status === 'active' ? 'default' : 'secondary'} className="text-[9px] h-4 font-mono px-1.5 uppercase">
              {status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Playback Mode Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 transition-colors", playbackEnabled ? "text-primary bg-primary/10" : "text-muted-foreground")}
              onClick={() => {
                setPlaybackEnabled(!playbackEnabled);
                if (playbackEnabled && videoRef.current) {
                  videoRef.current.play();
                  setPlaybackRate(1);
                }
              }}
              title="Toggle Playback Controls"
            >
              <MonitorPlay className="h-3.5 w-3.5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 transition-colors">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 font-mono">
                <DropdownMenuLabel className="text-[10px] uppercase">Detection Layers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(visibleClasses).map((cls) => (
                  <DropdownMenuCheckboxItem
                    key={cls}
                    checked={visibleClasses[cls]}
                    onCheckedChange={() => toggleClass(cls)}
                    className="text-[10px] uppercase"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLORS[cls] }} />
                      {cls}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showTracks}
                  onCheckedChange={setShowTracks}
                  className="text-[10px] uppercase"
                >
                  Show Object Tracks
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={playbackEnabled}
                  onCheckedChange={setPlaybackEnabled}
                  className="text-[10px] uppercase"
                >
                  Playback Mode
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="p-0 relative group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <canvas ref={canvasRef} className="w-full aspect-video bg-black object-contain " />
        <video 
          ref={videoRef} 
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} 
          muted 
          playsInline 
        />
        
        {/* Statistics Overlay */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded flex gap-3 items-center backdrop-blur-md border border-white/10 opacity-80 hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {stats.vehicle}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {stats.person}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {stats.animal}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {stats.accident}</span>
        </div>

        {alert && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-2 z-20">
            <div className="bg-red-600 text-white text-[10px] font-bold font-mono px-3 py-1 rounded animate-pulse border border-red-400 shadow-lg shadow-red-900/50">
              ⚠️ {alert.type.toUpperCase()}
            </div>
          </div>
        )}

        {/* Playback Controls Overlay (Conditional) */}
        {playbackEnabled && (
          <div className={cn(
            "absolute inset-0 bg-black/40 flex flex-col justify-end transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <div className="px-3 py-1">
              <Slider 
                value={[currentTime]} 
                max={duration} 
                step={0.01}
                onValueChange={(v) => { if (videoRef.current) videoRef.current.currentTime = v[0]; }}
                className="h-1 cursor-pointer"
              />
            </div>
            <div className="px-3 pb-3 pt-1 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={handlePlayPause}>
                  {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => stepFrame(-1)}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => stepFrame(1)}>
                  <SkipForward className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 ml-1">
                      <Gauge className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-24 font-mono">
                    {[0.5, 1, 2, 4].map(rate => (
                      <DropdownMenuItem 
                        key={rate} 
                        className="text-[10px] uppercase cursor-pointer"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.playbackRate = rate;
                            setPlaybackRate(rate);
                          }
                        }}
                      >
                        {rate}x {rate === playbackRate && '✓'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="text-[10px] text-white font-mono ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                {zoomLevel > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoomLevel(1)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={takeSnapshot}>
                  <Camera className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleFullScreen}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Playback Status Icon (Visible when paused and controls visible) */}
        {playbackEnabled && !isPlaying && !showControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm border border-white/10">
              <Pause className="h-8 w-8 text-white fill-white opacity-50" />
            </div>
          </div>
        )}

        {zoomLevel > 1 && (
          <div className="absolute bottom-2 right-2 bg-primary/20 text-primary text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-md border border-primary/30 animate-pulse">
            ZOOM: {zoomLevel}x
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveVideoFeed;
