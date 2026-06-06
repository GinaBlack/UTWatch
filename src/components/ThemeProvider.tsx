import { useState, useEffect, createContext, useContext } from "react";
import { auth, db } from "../firebase/firebase_config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { logSystemAction } from "../lib/audit";

type Theme = "dark" | "light";

export type UserRole = "Administrator" | "Traffic Officer" | "Emergency Responder";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  emailVerified: boolean;
}

export interface AppNotification {
  id: string;
  type: "accident" | "congestion" | "violation" | "system";
  title: string;
  description: string;
  time: string;
  read: boolean;
  severity: "critical" | "high" | "medium" | "info";
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: "1", type: "accident", title: "Multi-vehicle collision", description: "CAM-NW-01 detected a collision at Main St & 5th Ave. Emergency services notified.", time: "2 min ago", read: false, severity: "critical" },
  { id: "2", type: "congestion", title: "Heavy congestion alert", description: "Highway 101 North traffic density exceeds 90%. Estimated delay: 25 min.", time: "8 min ago", read: false, severity: "high" },
];

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "read">) => void;
  clearNotifications: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextType>({
  theme: "dark",
  toggleTheme: () => {},
  user: null,
  loading: true,
  logout: async () => {},
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  clearNotifications: () => {},
  markNotificationRead: () => {},
  markAllNotificationsRead: () => {},
});

export const useTheme = () => {
  const { theme, toggleTheme } = useContext(AppContext);
  return { theme, toggleTheme };
};

export const useAuth = () => {
  const { user, loading, logout } = useContext(AppContext);
  return { user, loading, logout };
};

export const useNotifications = () => {
  const { notifications, unreadCount, addNotification, clearNotifications, markNotificationRead, markAllNotificationsRead } = useContext(AppContext);
  return { notifications, unreadCount, addNotification, clearNotifications, markNotificationRead, markAllNotificationsRead };
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored || "dark";
  });

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const stored = localStorage.getItem("traffic_notifications");
    return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userData.fullName || firebaseUser.displayName,
              role: userData.role as UserRole,
              emailVerified: firebaseUser.emailVerified,
            });
          } else {
            // Fallback if doc doesn't exist (e.g. initial Google login before profile creation)
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: "Emergency Responder", // Default role
              emailVerified: firebaseUser.emailVerified,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("traffic_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const logout = async () => {
    if (user) {
      await logSystemAction({
        userId: user.uid,
        userName: user.displayName || user.email || "Unknown",
        userRole: user.role,
        action: "LOGOUT",
        resource: "AUTH",
        details: "User logged out of session"
      });
    }
    await signOut(auth);
    setUser(null);
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  const addNotification = (notification: Omit<AppNotification, "id" | "read">) => {
    setNotifications(prev => [{ ...notification, id: crypto.randomUUID(), read: false }, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(notification => notification.id === id ? { ...notification, read: true } : notification));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  return (
    <AppContext.Provider value={{ 
      theme, 
      toggleTheme, 
      user, 
      loading, 
      logout, 
      notifications, 
      unreadCount, 
      addNotification, 
      clearNotifications, 
      markNotificationRead, 
      markAllNotificationsRead 
    }}>
      {children}
    </AppContext.Provider>
  );
};
