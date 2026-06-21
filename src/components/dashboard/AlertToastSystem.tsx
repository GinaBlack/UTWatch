import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/components/ThemeProvider";
import socketService from "../../services/socket";

const AlertToastSystem = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { addNotification } = useNotifications();
  const isInitialized = useRef(false);

  const playCriticalAlert = () => {
    if (typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      context.resume().catch(() => undefined);
    }

    const now = context.currentTime;
    [0, 0.24].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(index === 0 ? 880 : 740, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.2);
    });
  };

  useEffect(() => {
    // 1. Fetch History
    const fetchHistory = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/alerts`);
        const data = await response.json();
        
        console.log("Fetched historical alerts:", data.alerts.length);
        
        // Seed history into the UI
        data.alerts.forEach((alert: any) => {
          const typeStr = alert.type.replace(/_/g, ' ').toUpperCase();
          const date = new Date(alert.timestamp);
          addNotification({
            type: "accident",
            title: `🚨 ${typeStr} (HISTORY)`,
            description: `${alert.camera_id}: ${alert.details} recorded on ${date.toLocaleString()}`,
            severity: "critical",
            time: date.toLocaleTimeString(),
          });
        });
      } catch (err) {
        console.error("Failed to fetch alert history:", err);
      }
    };

    if (!isInitialized.current) {
      fetchHistory();
      isInitialized.current = true;
    }

    // 2. Listen for real-time alerts from Socket.IO
    const socket = socketService.connect();
    if (!socket) return;

    const handleAccidentAlert = (alertData: any) => {
      console.log("Real-time alert received via Socket.IO:", alertData);
      
      const typeStr = alertData.type.replace(/_/g, ' ').toUpperCase();
      const severity = alertData.severity || "high";
      const isOverspeeding = alertData.type === 'overspeeding';
      const type = isOverspeeding ? "violation" : "accident";
      
      const title = `🚨 ${typeStr} DETECTED`;
      const description = `${alertData.camera_id}: ${alertData.details} detected on live vision node.`;
      
      addNotification({
        type: type,
        title: title,
        description: description,
        severity: severity,
        time: "Just now",
      });

      if (severity === "critical") {
        playCriticalAlert();
      }
      
      if (severity === "critical") {
        toast.error(title, {
          description: description,
          duration: 8000,
          style: {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            borderLeft: "4px solid #ef4444",
          },
        });
      } else {
        toast.warning(title, {
          description: description,
          duration: 5000,
          style: {
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            borderLeft: "4px solid #f59e0b",
          },
        });
      }
    };

    socket.on('accident_alert', handleAccidentAlert);

    return () => {
      socket.off('accident_alert', handleAccidentAlert);
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, [addNotification]);

  return null;
};

export default AlertToastSystem;
