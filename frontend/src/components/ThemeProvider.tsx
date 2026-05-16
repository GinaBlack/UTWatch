import { useState, useEffect, createContext, useContext } from "react";

type Theme = "dark" | "light";

interface AuthUser {
  email: string;
  name: string;
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
  login: (email: string, password: string) => boolean;
  signup: (name: string, email: string, password: string) => boolean;
  logout: () => void;
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
  login: () => false,
  signup: () => false,
  logout: () => {},
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
  const { user, login, signup, logout } = useContext(AppContext);
  return { user, login, signup, logout };
};

export const useNotifications = () => {
  const { notifications, unreadCount, addNotification, clearNotifications, markNotificationRead, markAllNotificationsRead } = useContext(AppContext);
  return { notifications, unreadCount, addNotification, clearNotifications, markNotificationRead, markAllNotificationsRead };
};

// Demo accounts store
const DEMO_ACCOUNTS = [
  { email: "admin@traffic.io", password: "admin123", name: "Admin User" },
  { email: "operator@traffic.io", password: "operator123", name: "Operator" },
];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    return stored || "dark";
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const stored = localStorage.getItem("traffic_notifications");
    return stored ? JSON.parse(stored) : INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("traffic_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const login = (email: string, password: string): boolean => {
    const accounts = JSON.parse(localStorage.getItem("registered_accounts") || "[]");
    const allAccounts = [...DEMO_ACCOUNTS, ...accounts];
    const found = allAccounts.find(a => a.email === email && a.password === password);
    if (found) {
      const authUser = { email: found.email, name: found.name };
      setUser(authUser);
      localStorage.setItem("auth_user", JSON.stringify(authUser));
      return true;
    }
    return false;
  };

  const signup = (name: string, email: string, password: string): boolean => {
    const accounts = JSON.parse(localStorage.getItem("registered_accounts") || "[]");
    const allAccounts = [...DEMO_ACCOUNTS, ...accounts];
    if (allAccounts.find(a => a.email === email)) return false;
    accounts.push({ email, password, name });
    localStorage.setItem("registered_accounts", JSON.stringify(accounts));
    const authUser = { email, name };
    setUser(authUser);
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
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
    <AppContext.Provider value={{ theme, toggleTheme, user, login, signup, logout, notifications, unreadCount, addNotification, clearNotifications, markNotificationRead, markAllNotificationsRead }}>
      {children}
    </AppContext.Provider>
  );
};
