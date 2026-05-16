// src/components/dashboard/LiveVideoFeed.tsx
import React, { useEffect, useRef, useState } from 'react';
import socketService from '../../services/socket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Settings2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stats, setStats] = useState({ vehicle: 0, person: 0, animal: 0, obstacle: 0, accident: 0 });
  const [alert, setAlert] = useState<{ type: string; details: string } | null>(null);
  
  // Use a ref for detections to avoid closure issues in the animation loop
  const detectionsRef = useRef<any[]>([]);
  
  const [visibleClasses, setVisibleClasses] = useState<Record<string, boolean>>({
    vehicle: true,
    accident: true,
    person: true,
    animal: true,
    obstacle: true,
  });
  
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
      detectionsRef.current = data.detections || [];
      isProcessing.current = false;
    };

    const handleAccidentAlert = (alertData: any) => {
      if (alertData.camera_id && alertData.camera_id !== cameraId) return;
      setAlert(alertData);
      setTimeout(() => setAlert(null), 5000);
    };

    socket.on('detection_result', handleDetectionResult);
    socket.on('accident_alert', handleAccidentAlert);

    return () => {
      socket.off('detection_result', handleDetectionResult);
      socket.off('accident_alert', handleAccidentAlert);
    };
  }, [cameraId]);

  // Video playback and frame sending
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = videoSrc;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    
    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay failed, waiting for interaction:', err);
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

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx1, sy1, sw, sh);

        ctx.fillStyle = color;
        const label = `${det.class_name} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 12px monospace';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(sx1, sy1 - 20, textWidth + 10, 20);

        ctx.fillStyle = 'white';
        ctx.fillText(label, sx1 + 5, sy1 - 5);
      });
    };

    const sendFrame = () => {
      if (!canvasRef.current || !video || video.paused || video.ended) {
        requestRef.current = requestAnimationFrame(sendFrame);
        return;
      }
      
      if (video.videoWidth === 0) {
        requestRef.current = requestAnimationFrame(sendFrame);
        return;
      }

      // If processing is taking too long (over 2 seconds), reset it
      if (isProcessing.current && Date.now() - lastFrameTime.current > 2000) {
        isProcessing.current = false;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Always draw using the latest detections from the ref
        drawBoxes(ctx, detectionsRef.current, canvas.width, canvas.height);
      }

      if (!isProcessing.current) {
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
                camera_id: cameraId 
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
      video.pause();
      video.src = '';
    };
  }, [videoSrc, cameraId, visibleClasses]); // detections removed from deps to prevent re-runs

  const toggleClass = (className: string) => {
    setVisibleClasses(prev => ({
      ...prev,
      [className]: !prev[className]
    }));
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2 py-3">
        <CardTitle className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span>{location}</span>
            <Badge variant={status === 'alert' ? 'destructive' : status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-4">
              {status}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Settings2 className="h-4 w-4" />
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
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <canvas ref={canvasRef} className="w-full aspect-video bg-black object-contain" />
        <video 
          ref={videoRef} 
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} 
          muted 
          playsInline 
          autoPlay 
        />
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded flex gap-2 items-center backdrop-blur-sm border border-white/10">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {stats.vehicle}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {stats.accident}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {stats.person}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {stats.animal}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> {stats.obstacle}</span>
        </div>
        {alert && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold font-mono px-3 py-1 rounded animate-pulse border border-red-400 shadow-lg shadow-red-900/50">
            ⚠️ {alert.type.toUpperCase()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveVideoFeed;
