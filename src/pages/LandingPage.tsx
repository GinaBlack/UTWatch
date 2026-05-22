import { motion } from "framer-motion";
import { Shield, Camera, AlertTriangle, Activity, ArrowRight, Monitor, Zap, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/ThemeProvider";

const features = [
  { icon: Camera, title: "Real-Time Video Processing", description: "Capture and process multiple video feeds simultaneously with AI-powered analysis" },
  { icon: Monitor, title: "Vehicle Detection", description: "Detect and classify vehicles in real time using advanced computer vision algorithms" },
  { icon: Activity, title: "Traffic Density Monitoring", description: "Monitor congestion levels across zones with live density heatmaps and analytics" },
  { icon: AlertTriangle, title: "Accident Detection", description: "Automatically detect collisions and anomalies with instant alert generation" },
  { icon: Zap, title: "Instant Alerts", description: "Receive real-time notifications for incidents with severity classification" },
  { icon: Lock, title: "Secure & Scalable", description: "Enterprise-grade security with multi-camera support and redundant systems" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="glass-panel mx-3 mt-3 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
          <span className="font-mono font-bold text-sm tracking-wider text-foreground">UT WATCH</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Dashboard <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground font-mono text-xs font-semibold hover:bg-secondary/80 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-xs font-mono text-primary">AI-POWERED SURVEILLANCE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tight text-foreground mb-6 leading-tight">
            Real-Time Traffic
            <br />
            <span className="text-primary">Monitoring & Detection</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Advanced AI-powered system for urban road surveillance, real-time vehicle detection,
            traffic density analysis, and automatic accident detection with instant alert generation.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
              className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-mono font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 glow-primary"
            >
              {user ? "Open Dashboard" : "Get Started"} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-md bg-secondary text-secondary-foreground font-mono font-semibold text-sm hover:bg-secondary/80 transition-colors"
            >
              Learn More
            </button>
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <div className="max-w-4xl mx-auto px-6 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {[
            { value: "99.7%", label: "Detection Accuracy" },
            { value: "<50ms", label: "Response Time" },
            { value: "24/7", label: "Monitoring" },
            { value: "500+", label: "Cameras Supported" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold font-mono text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold font-mono text-foreground mb-3">Core Capabilities</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Built for modern urban traffic management with enterprise-grade reliability
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="glass-panel p-5 hover:glow-primary transition-shadow duration-300"
            >
              <div className="rounded-md bg-secondary p-2.5 w-fit mb-3">
                <feat.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold font-mono text-foreground mb-2">{feat.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel mx-3 mb-3 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-4 w-4 object-contain" />
          <span className="text-xs font-mono text-muted-foreground">Urban Traffic Watch © 2026</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">v2.1.0</span>
      </footer>
    </div>
  );
};

export default LandingPage;
