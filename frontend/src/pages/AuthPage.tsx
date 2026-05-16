import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/components/ThemeProvider";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      const success = login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } else {
      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      const success = signup(name, email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Account with this email already exists");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 glow-primary">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
              <h1 className="text-xl font-bold font-mono tracking-wider text-foreground uppercase">
                UT WATCH
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Sign in to access the monitoring dashboard" : "Create a new operator account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="operator@traffic.io"
                required
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive font-mono"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-mono font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-xs text-primary hover:underline font-mono"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          {isLogin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-3 rounded-md bg-secondary/50 border border-border/50"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                Demo Accounts
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-foreground">admin@traffic.io</span>
                  <span className="text-xs font-mono text-muted-foreground">admin123</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-foreground">operator@traffic.io</span>
                  <span className="text-xs font-mono text-muted-foreground">operator123</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
