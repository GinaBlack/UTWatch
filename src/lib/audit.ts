import { db } from "../firebase/firebase_config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type AuditAction = 
  | "LOGIN" 
  | "LOGOUT" 
  | "REGISTER" 
  | "UPDATE_THRESHOLD" 
  | "CLEAR_ALERTS" 
  | "CHANGE_DETECTION_MODE"
  | "UPDATE_SYSTEM_CONFIG"
  | "ACCESS_DENIED"
  | "CAMERA_ADD"
  | "CAMERA_DELETE"
  | "CAMERA_TOGGLE_STATUS"
  | "USER_UPDATE_ROLE"
  | "USER_DELETE"
  | "ALERTS_MARK_READ"
  | "DATABASE_BACKUP"
  | "FILE_DOWNLOAD";

export interface AuditLogEntry {
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  details: string;
  timestamp?: any;
}

/**
 * Logs a system action to the Firestore 'audit_logs' collection.
 */
export const logSystemAction = async (entry: AuditLogEntry) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log system action:", error);
  }
};
