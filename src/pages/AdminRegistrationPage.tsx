import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Calendar, Phone, Fingerprint, Check, X, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { auth, db } from "../firebase/firebase_config";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { logSystemAction } from "../lib/audit";
import { toast } from "sonner";
import validator from "validator";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const AdminRegistrationPage = () => {
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    dob: "",
    phone: "",
    adminSecretKey: "",
  });

  const validateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 13;
  };

  const fieldValidation = useMemo(() => {
    return {
      fullName: formData.fullName.trim().length >= 3 && formData.fullName.trim().length <= 50,
      email: validator.isEmail(formData.email),
      dob: formData.dob ? validateAge(formData.dob) : false,
      phone: formData.phone.length >= 8,
      password: Object.values({
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        symbol: /[^A-Za-z0-9]/.test(formData.password),
      }).every(Boolean),
      confirmPassword: formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password,
    };
  }, [formData]);

  const passwordCriteria = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    symbol: /[^A-Za-z0-9]/.test(formData.password),
  };

  const isPasswordStrong = Object.values(passwordCriteria).every(Boolean);

  const sanitizeInput = (data: typeof formData) => {
    return {
      ...data,
      fullName: validator.escape(validator.trim(data.fullName)),
      email: validator.normalizeEmail(data.email) || data.email,
      phone: validator.trim(data.phone),
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attemptCount >= 5) {
      toast.error("MAX ATTEMPTS REACHED.");
      return;
    }
    setLoading(true);
    setAttemptCount(prev => prev + 1);

    try {
      const sanitizedData = sanitizeInput(formData);
      
      if (sanitizedData.adminSecretKey !== "0000") throw new Error("INVALID ADMIN SECRET KEY.");
      if (!validateAge(sanitizedData.dob)) throw new Error("Operator must be 13+.");
      if (sanitizedData.fullName.length > 50) throw new Error("Name too long.");
      if (sanitizedData.password.length < 8 || !isPasswordStrong) throw new Error("Weak password.");
      if (sanitizedData.password !== sanitizedData.confirmPassword) throw new Error("Passwords mismatch.");

      const result = await createUserWithEmailAndPassword(auth, sanitizedData.email, sanitizedData.password);
      
      await setDoc(doc(db, "users", result.user.uid), {
        fullName: sanitizedData.fullName,
        email: sanitizedData.email,
        role: "Administrator",
        dob: sanitizedData.dob,
        phone: sanitizedData.phone,
        isVerified: false,
        department: "N/A",
        employeeId: "N/A",
        createdAt: serverTimestamp(),
      });

      await updateProfile(result.user, { displayName: sanitizedData.fullName });
      await sendEmailVerification(result.user);
      
      await logSystemAction({
        userId: result.user.uid,
        userName: sanitizedData.fullName,
        userRole: "Administrator",
        action: "REGISTER",
        resource: "AUTH",
        details: "New Administrator account created."
      });

      toast.success("Admin registered! Please verify email.");
      navigate("/verification");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg glass-panel p-8">
        <h1 className="text-xl font-bold font-mono text-center uppercase mb-6">Administrator Initiation</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Full Name</label>
            <div className="relative">
              <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input name="fullName" type="text" value={formData.fullName} onChange={handleChange} required className={`auth-input pl-10 ${formData.fullName ? (fieldValidation.fullName ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Email</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} required className={`auth-input ${formData.email ? (fieldValidation.email ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} />
          </div>
          <div className="grid grid-cols-1  gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Date of Birth</label>
              <input name="dob" type="date" value={formData.dob} onChange={handleChange} required className={`auth-input ${formData.dob ? (fieldValidation.dob ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Phone</label>
              <div className="phone-input-container relative">
                <PhoneInput
                  country={"cm"}
                  value={formData.phone}
                  onChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                  containerClass="auth-phone-input"
                  inputClass="auth-input !pl-12 !pr-10"
                  buttonClass="auth-phone-button"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-muted-foreground">Admin Secret Key</label>
            <input name="adminSecretKey" type="password" value={formData.adminSecretKey} onChange={handleChange} required className="auth-input border-primary" placeholder="0000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} required className={`auth-input pr-10 ${isPasswordStrong ? 'border-emerald-500/50' : ''}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Confirm</label>
              <div className="relative">
                <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} required className={`auth-input pr-10 ${formData.confirmPassword && fieldValidation.confirmPassword ? 'border-emerald-500/50' : 'border-destructive/50'}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {formData.password.length > 0 && !isPasswordStrong && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 py-2 overflow-hidden"
              >
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Password Strength Analysis</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "8+ CHARACTERS", met: passwordCriteria.length },
                    { label: "UPPERCASE", met: passwordCriteria.uppercase },
                    { label: "LOWERCASE", met: passwordCriteria.lowercase },
                    { label: "NUMBER", met: passwordCriteria.number },
                    { label: "SPECIAL CHAR", met: passwordCriteria.symbol },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${c.met ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-destructive/30'}`} />
                      <span className={`text-[8px] font-mono ${c.met ? 'text-emerald-500' : 'text-muted-foreground'}`}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <Button type="submit" disabled={loading} className="w-full font-mono uppercase">Initialize Admin</Button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminRegistrationPage;