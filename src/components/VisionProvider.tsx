import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { db } from '@/firebase/firebase_config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import socketService from '../services/socket';

interface Camera {
  cameraId: string;
  location: string;
  status: 'active' | 'alert' | 'offline';
  videoSrc: string;
  type: 'webcam' | 'video' | 'rtsp';
}

interface CameraState {
  camera: Camera;
  stats: { vehicle: number; person: number; animal: number; obstacle: number; accident: number };
  detections: any[];
  resultsBuffer: Map<number, any>;
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  isProcessing: boolean;
  isSending: boolean;
  lastProcessedTime: number;
  recorder?: MediaRecorder;
  recordedChunks: Blob[];
  lastRotationTime: number;
}

interface VisionContextType {
  cameras: Camera[];
  cameraStates: Record<string, CameraState>;
  loading: boolean;
}

const VisionContext = createContext<VisionContextType>({
  cameras: [],
  cameraStates: {},
  loading: true,
});

export const useVision = () => useContext(VisionContext);

export const VisionProvider = ({ children }: { children: React.ReactNode }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraStates, setCameraStates] = useState<Record<string, CameraState>>({});
  
  // Use refs for values that change frequently to avoid re-renders
  const statesRef = useRef<Record<string, CameraState>>({});
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const requestRef = useRef<number>();

  // 1. Sync cameras from Firestore
  useEffect(() => {
    const q = query(collection(db, "cameras"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camsData: Camera[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        camsData.push({ 
          cameraId: doc.id, 
          location: data.location, 
          status: data.status, 
          videoSrc: data.source,
          type: data.type || 'video'
        });
      });
      setCameras(camsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Initialize and manage video elements for each camera
  useEffect(() => {
    const newStates: Record<string, CameraState> = { ...statesRef.current };
    let changed = false;

    // Remove inactive cameras
    Object.keys(newStates).forEach(id => {
      if (!cameras.find(c => c.cameraId === id)) {
        if (newStates[id].videoElement) {
          newStates[id].videoElement!.pause();
          newStates[id].videoElement!.src = '';
        }
        delete newStates[id];
        changed = true;
      }
    });

    // Add new cameras
    cameras.forEach(camera => {
      if (!newStates[camera.cameraId]) {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.crossOrigin = "anonymous";
        
        if (camera.type === 'webcam') {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => { video.srcObject = stream; video.play(); })
            .catch(err => console.error("Webcam access error:", err));
        } else {
          video.src = camera.videoSrc;
          video.play().catch(e => console.warn("Video play error:", e));
        }

        newStates[camera.cameraId] = {
          camera,
          stats: { vehicle: 0, person: 0, animal: 0, obstacle: 0, accident: 0 },
          detections: [],
          resultsBuffer: new Map(),
          videoElement: video,
          canvasElement: null,
          isProcessing: false,
          isSending: false,
          lastProcessedTime: 0,
          recordedChunks: [],
          lastRotationTime: Date.now()
        };
        changed = true;
      }
    });

    if (changed) {
      statesRef.current = newStates;
      setCameraStates({ ...newStates });
    }
  }, [cameras]);

  // 3. Socket listeners for detection results
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    const handleDetectionResult = (data: any) => {
      const state = statesRef.current[data.camera_id];
      if (!state) return;

      state.stats = data.counts;
      state.isProcessing = false;

      if (data.frame_id !== undefined) {
        const fid = Math.round(data.frame_id * 100) / 100;
        state.resultsBuffer.set(fid, data.detections || []);
        
        if (state.resultsBuffer.size > 50) {
          const keys = Array.from(state.resultsBuffer.keys()).sort((a, b) => a - b);
          state.resultsBuffer.delete(keys[0]);
        }
      } else {
        state.detections = data.detections || [];
      }
      
      // Trigger a light-weight state update for UI
      setCameraStates(prev => ({
        ...prev,
        [data.camera_id]: { ...state }
      }));
    };

    socket.on('detection_result', handleDetectionResult);
    return () => {
      socket.off('detection_result', handleDetectionResult);
    };
  }, []);

  // 4. Background processing loop (sending frames & managing recording)
  const processFrames = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket || !socket.connected) {
      requestRef.current = requestAnimationFrame(processFrames);
      return;
    }

    const now = Date.now();
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

    Object.entries(statesRef.current).forEach(([id, state]) => {
      const video = state.videoElement;
      if (!video || video.paused || video.readyState < 2) return;

      // --- AUTOMATED FRONTEND RECORDING ---
      if (!state.recorder) {
        let stream: MediaStream | null = null;
        if (video.srcObject) {
          stream = video.srcObject as MediaStream;
        } else if ((video as any).captureStream) {
          stream = (video as any).captureStream();
        }

        if (stream) {
          try {
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
            state.recorder = recorder;
            state.recorder.ondataavailable = (e) => { 
              if (e.data.size > 0) {
                state.recordedChunks.push(e.data);
              }
            };
            state.recorder.onstop = () => {
              const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
              const formData = new FormData();
              formData.append('video', blob, `${id}.webm`);
              formData.append('camera_id', id);
              fetch(`${backendUrl}/api/recordings/upload`, { method: 'POST', body: formData })
                .catch(err => console.error("Upload error:", err));
              state.recordedChunks = [];
            };
            state.recorder.start(1000); // Collect data every second
            console.log(`[Recorder] Started automated recording for ${id}`);
          } catch (e) {
            console.error("Failed to start MediaRecorder:", e);
          }
        }
      }

      // Check for rotation (every 5 minutes)
      if (state.recorder && state.recorder.state === 'recording' && now - state.lastRotationTime > 300000) {
        state.recorder.stop();
        state.lastRotationTime = now;
        state.recorder.start(1000);
        console.log(`[Recorder] Rotated recording for ${id}`);
      }
      // ------------------------------------

      // Rate limit frame sending to ~10 FPS per camera to save bandwidth
      if (now - state.lastProcessedTime < 100) return; 

      if (!state.isSending) {
        const canvas = offscreenCanvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          state.isSending = true;
          canvas.toBlob((blob) => {
            if (blob) {
              state.lastProcessedTime = now;
              socket.emit('frame', { 
                image: blob,
                camera_id: id,
                frame_id: state.camera.type === 'webcam' ? now / 1000 : video.currentTime
              });
            }
            state.isSending = false;
          }, 'image/jpeg', 0.5);
        }
      }
    });

    requestRef.current = requestAnimationFrame(processFrames);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrames);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [processFrames]);

  return (
    <VisionContext.Provider value={{ cameras, cameraStates, loading }}>
      {children}
      {/* Persistent hidden container for video elements to keep them playing */}
      <div style={{ position: 'fixed', top: -1000, left: -1000, opacity: 0, pointerEvents: 'none' }}>
        {Object.entries(cameraStates).map(([id, state]) => (
          <VideoAttachment key={id} video={state.videoElement} />
        ))}
      </div>
    </VisionContext.Provider>
  );
};

// Helper component to mount video elements in the background
const VideoAttachment = ({ video }: { video: HTMLVideoElement | null }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (video && ref.current && !ref.current.contains(video)) {
      ref.current.appendChild(video);
    }
  }, [video]);
  return <div ref={ref} />;
};
