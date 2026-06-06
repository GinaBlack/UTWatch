// src/components/dashboard/LiveVideoFeed.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Settings2, 
  MonitorPlay,
  Camera,
  Maximize,
  AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useVision } from '../VisionProvider';

interface LiveVideoFeedProps {
  cameraId: string;
  location: string;
  status: 'active' | 'alert' | 'offline';
  className?: string;
}

const CLASS_COLORS: Record<string, string> = {
  vehicle: '#3b82f6',
  accident: '#ef4444',
  person: '#10b981',
  animal: '#f59e0b',
  obstacle: '#8b5cf6',
};

const LiveVideoFeed: React.FC<LiveVideoFeedProps> = ({
  cameraId,
  location,
  status,
  className,
}) => {
  const { cameraStates } = useVision();
  const state = cameraStates[cameraId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [visibleClasses, setVisibleClasses] = useState<Record<string, boolean>>({
    vehicle: true, person: true, animal: true, obstacle: true, accident: true,
  });
  const [showTracks, setShowTracks] = useState(true);

  // Drawing loop
  useEffect(() => {
    if (!state || !state.videoElement || !canvasRef.current) return;
    
    let requestRef: number;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = state.videoElement;

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

        // Tracks (if available in state)
        if (showTracks && det.trail && det.trail.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(det.trail[0][0] * scaleX, det.trail[0][1] * scaleX);
          for (let i = 1; i < det.trail.length; i++) ctx.lineTo(det.trail[i][0] * scaleX, det.trail[i][1] * scaleX);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx1, sy1, sw, sh);
        ctx.fillStyle = color;
        const label = `${det.class_name} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 10px monospace';
        ctx.fillRect(sx1, sy1 - 15, ctx.measureText(label).width + 6, 15);
        ctx.fillStyle = 'white';
        ctx.fillText(label, sx1 + 3, sy1 - 4);
      });
    };

    const render = () => {
      if (ctx && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Use latest detections from state buffer
        const fid = Math.round(video.currentTime * 100) / 100;
        let detections = state.detections;
        const keys = Array.from(state.resultsBuffer.keys()).filter(k => k <= fid);
        if (keys.length > 0) detections = state.resultsBuffer.get(Math.max(...keys)) || detections;
        
        drawBoxes(ctx, detections, canvas.width, canvas.height);
      }
      requestRef = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(requestRef);
  }, [state, visibleClasses, showTracks]);

  if (!state) return <div className="p-4 bg-secondary/20 animate-pulse aspect-video rounded-lg" />;

  return (
    <Card ref={containerRef} className={cn('overflow-hidden border-border/50 bg-card/30', className)}>
      <CardHeader className="pb-2 py-3 bg-secondary/20 border-b border-border/10">
        <CardTitle className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-tight">{location}</span>
            <Badge variant={status === 'alert' ? 'destructive' : 'default'} className="text-[9px] h-4 font-mono px-1.5 uppercase">{status}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-mono">
              <DropdownMenuLabel className="text-[10px] uppercase">Detection Layers</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.keys(visibleClasses).map((cls) => (
                <DropdownMenuCheckboxItem key={cls} checked={visibleClasses[cls]} onCheckedChange={() => setVisibleClasses(prev => ({...prev, [cls]: !prev[cls]}))} className="text-[10px] uppercase">
                  {cls}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 relative">
        <canvas ref={canvasRef} className="w-full aspect-video bg-black object-contain" />
        <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded flex gap-3 items-center backdrop-blur-md">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {state.stats.vehicle}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {state.stats.person}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveVideoFeed;
