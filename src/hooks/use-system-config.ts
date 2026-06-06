import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase_config";

export interface SystemConfig {
  initialized: boolean;
  adminSecretKey: string;
  companySecretKey: string;
  boundingBoxDisplay: boolean;
  displayClasses: string[];
  yoloConfidenceThreshold: number;
  collisionIoUThreshold: number;
  audioAlarms: boolean;
  alertHistoryRetentionDays: number;
  videoStoragePath: string;
  speedLimitKph: number;
  videoRecordIntervalMinutes: number;
  enableOverspeedingAlerts: boolean;
}

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setConfig(docSnapshot.data() as SystemConfig);
      } else {
        setConfig(null); // System not initialized
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { config, loading };
};
