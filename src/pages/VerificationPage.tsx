import { motion } from "framer-motion";
import { Mail, CheckCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase_config";
import { sendEmailVerification, reload } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/ThemeProvider";

const VerificationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.emailVerified) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleVerify = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { isVerified: true });
        toast.success("Email verified successfully!");
        navigate("/dashboard", { replace: true });
      } else {
        toast.error("Email not yet verified. Please click the link in your inbox.");
      }
    } catch (error: any) {
      toast.error("Error checking verification status.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await sendEmailVerification(user);
      toast.success("Verification email resent!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass-panel p-8 text-center glow-primary">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Mail className="h-12 w-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground uppercase mb-2">
            Verify Your Email
          </h1>
          
          <p className="text-sm text-muted-foreground font-mono mb-8">
            We've sent a verification link to <span className="text-primary font-bold">{user?.email}</span>. 
            Please check your inbox and click the link to activate your account.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full py-3 rounded-md bg-primary text-primary-foreground font-mono font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              I'VE VERIFIED MY EMAIL
            </button>

            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full py-3 rounded-md bg-secondary text-foreground font-mono font-bold text-sm flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              RESEND VERIFICATION LINK
            </button>
          </div>

          <button
            onClick={() => navigate("/auth")}
            className="mt-8 text-xs text-muted-foreground hover:text-primary font-mono flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="h-3 w-3" />
            BACK TO LOGIN
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerificationPage;
