import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, LogIn, UserPlus, Github, Calendar, Phone, Briefcase, Building, Fingerprint, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase_config";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { logSystemAction } from "../lib/audit";
import { toast } from "sonner";
import validator from "validator";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Form States
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    dob: "",
    phone: "",
    role: "Emergency Responder" as any,
    companySecretKey: "",
  });

  const validateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 13;
  };

  const fieldValidation = useMemo(() => {
    return {
      fullName: formData.fullName.trim().length >= 3,
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

  const passwordCriteria = useMemo(() => {
    return {
      length: formData.password.length >= 8,
      uppercase: /[A-Z]/.test(formData.password),
      lowercase: /[a-z]/.test(formData.password),
      number: /[0-9]/.test(formData.password),
      symbol: /[^A-Za-z0-9]/.test(formData.password),
    };
  }, [formData.password]);

  const isPasswordStrong = fieldValidation.password;

  const sanitizeInput = (data: typeof formData) => {
    return {
      ...data,
      fullName: validator.escape(validator.trim(data.fullName)),
      email: validator.normalizeEmail(data.email) || data.email,
      phone: validator.trim(data.phone),
    };
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'companySecretKey') {
      if (value.length > 5) {
        const isValid = await validateSecretKey(value);
        setIsKeyValid(isValid);
      } else {
        setIsKeyValid(null);
      }
    }
  };

  const validateSecretKey = async (key: string) => {
    // Admin check
    if (formData.role === "Administrator") {
      return key === "0000";
    }
    
    // Non-admin check
    try {
      const configDoc = await getDoc(doc(db, "system", "config"));
      if (!configDoc.exists()) {
        return false;
      }
      return key === configDoc.data().companySecretKey;
    } catch (error) {
      console.error("Key validation error:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && attemptCount >= 5) {
      toast.error("MAX REGISTRATION ATTEMPTS REACHED. PLEASE CONTACT SYSTEM ADMINISTRATOR.");
      return;
    }

    setLoading(true);

    try {
      const sanitizedData = sanitizeInput(formData);

      if (isLogin) {
        // Login Logic (No Google Login)
        const result = await signInWithEmailAndPassword(auth, sanitizedData.email, sanitizedData.password);
        const user = result.user;
        
        // Fetch role for logging
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.exists() ? userDoc.data().role : "Unknown";

        await logSystemAction({
          userId: user.uid,
          userName: userDoc.exists() ? userDoc.data().fullName : (user.displayName || user.email),
          userRole: role,
          action: "LOGIN",
          resource: "AUTH",
          details: "User logged in via Email/Password"
        });

        toast.success("Successfully logged in");
        navigate("/dashboard");
      } else {
        // Registration Logic
        setAttemptCount(prev => prev + 1);

        // 1. Age Validation
        if (!validateAge(sanitizedData.dob)) {
          throw new Error("ACCESS DENIED: Operator must be at least 13 years of age.");
        }

        // 2. Name Length Validation
        if (sanitizedData.fullName.length > 50) {
          throw new Error("NAME TOO LONG: Full name must not exceed 50 characters.");
        }

        // 3. Password Strength Validation (at least 8 chars)
        if (sanitizedData.password.length < 8) {
          throw new Error("WEAK CREDENTIALS: Password must be at least 8 characters.");
        }
        if (!isPasswordStrong) {
          throw new Error("WEAK CREDENTIALS: Password does not meet system security standards.");
        }

        if (sanitizedData.password !== sanitizedData.confirmPassword) {
          throw new Error("Passwords do not match");
        }

        // 4. Registration Logic: Validate key and handle admin promotion
        let role = sanitizedData.role;
        const isKey0000 = sanitizedData.companySecretKey === "0000";

        if (isKey0000) {
          role = "Administrator";
        } else {
          // Validate company secret key for other roles
          const isValidKey = await validateSecretKey(sanitizedData.companySecretKey);
          if (!isValidKey) {
            await logSystemAction({
              userId: "unauthorized_attempt",
              userName: sanitizedData.fullName,
              userRole: role,
              action: "ACCESS_DENIED",
              resource: "AUTH_REGISTRATION",
              details: `Registration failed: Invalid Company Secret Key provided for ${sanitizedData.role} role.`
            });
            throw new Error("INVALID COMPANY SECRET KEY: Verification required for all operator registrations.");
          }
        }

        const result = await createUserWithEmailAndPassword(auth, sanitizedData.email, sanitizedData.password);
        const user = result.user;

        // Create User Profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          fullName: sanitizedData.fullName,
          email: sanitizedData.email,
          role: role,
          dob: sanitizedData.dob,
          phone: sanitizedData.phone,
          isVerified: false,
          department: "N/A", // Auto-set per instructions
          employeeId: "N/A", // Auto-set per instructions
          createdAt: serverTimestamp(),
        });

        await updateProfile(user, { displayName: sanitizedData.fullName });
        await sendEmailVerification(user);

        await logSystemAction({
          userId: user.uid,
          userName: sanitizedData.fullName,
          userRole: role,
          action: "REGISTER",
          resource: "AUTH",
          details: `New account created with role: ${role}`
        });

        toast.success("Account created! Please verify your email.");
        navigate("/verification");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors group"
      >
        <Shield className="h-4 w-4 rotate-[-90deg] group-hover:rotate-0 transition-transform" />
        RETURN TO TERMINAL
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full ${isLogin ? 'max-w-md' : 'max-w-2xl'}`}
      >
        <div className="glass-panel p-8 glow-primary">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
              <h1 className="text-xl font-bold font-mono tracking-wider text-foreground uppercase">
                UT WATCH
              </h1>
            </div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {isLogin ? "Digital Traffic Monitoring Authorization" : "New Operator Protocol Initiation"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Full Name</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input 
                        name="fullName" 
                        type="text" 
                        value={formData.fullName} 
                        onChange={handleChange} 
                        required 
                        className={`auth-input pl-10 pr-10 ${formData.fullName ? (fieldValidation.fullName ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} 
                        placeholder="ENTER FULL NAME" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AnimatePresence mode="wait">
                          {formData.fullName && (
                            fieldValidation.fullName ? (
                              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-emerald-500"><Check className="h-4 w-4" /></motion.div>
                            ) : (
                              <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-destructive"><X className="h-4 w-4" /></motion.div>
                            )
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input 
                        name="dob" 
                        type="date" 
                        value={formData.dob} 
                        onChange={handleChange} 
                        required 
                        className={`auth-input pl-10 pr-10 ${formData.dob ? (fieldValidation.dob ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AnimatePresence mode="wait">
                          {formData.dob && (
                            fieldValidation.dob ? (
                              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-emerald-500"><Check className="h-4 w-4" /></motion.div>
                            ) : (
                              <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-destructive"><X className="h-4 w-4" /></motion.div>
                            )
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {formData.dob && !fieldValidation.dob && (
                      <p className="text-[8px] text-destructive font-mono uppercase mt-1 leading-tight">INVALID: Operator must be 13+ years old.</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Phone Number</label>
                    <div className="phone-input-container relative">
                      <PhoneInput
                        country={"cm"}
                        value={formData.phone}
                        onChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                        containerClass="auth-phone-input"
                        inputClass="auth-input !pl-12 !pr-10"
                        buttonClass="auth-phone-button"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                        <AnimatePresence mode="wait">
                          {formData.phone && (
                            fieldValidation.phone ? (
                              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-emerald-500"><Check className="h-4 w-4" /></motion.div>
                            ) : (
                              <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-destructive"><X className="h-4 w-4" /></motion.div>
                            )
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Designated Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <select name="role" value={formData.role} onChange={handleChange} className="auth-input pl-10 appearance-none">
                        <option value="Traffic Officer">Traffic Officer</option>
                        <option value="Emergency Responder">Emergency Responder</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1.5 block">Company Secret Key</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <input 
                        name="companySecretKey" 
                        type="text" 
                        value={formData.companySecretKey} 
                        onChange={handleChange} 
                        required 
                        className={`auth-input pl-10 pr-10 border-primary/50 focus:ring-primary ${isKeyValid !== null ? (isKeyValid ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} 
                        placeholder="ENTER REQUIRED VERIFICATION KEY" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AnimatePresence mode="wait">
                          {formData.companySecretKey.length > 0 && isKeyValid !== null && (
                            isKeyValid ? (
                              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-emerald-500"><Check className="h-4 w-4" /></motion.div>
                            ) : (
                              <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-destructive"><X className="h-4 w-4" /></motion.div>
                            )
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <p className="text-[8px] text-muted-foreground font-mono uppercase mt-1 leading-tight italic">
                      SECURITY PROTOCOL: REGISTRATION REQUIRES A VALID COMPANY KEY.
                    </p>
                  </div>

                  <AnimatePresence>
                    {formData.password.length > 0 && !isPasswordStrong && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:col-span-2 space-y-2 py-2 overflow-hidden"
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
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Email Address</label>
              <div className="relative">
                <input 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className={`auth-input pr-10 ${!isLogin && formData.email ? (fieldValidation.email ? 'border-emerald-500/50' : 'border-destructive/50') : ''}`} 
                  placeholder="OPERATOR@TRAFFIC.IO" 
                  required 
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <AnimatePresence mode="wait">
                    {!isLogin && formData.email && (
                      fieldValidation.email ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-emerald-500"><Check className="h-4 w-4" /></motion.div>
                      ) : (
                        <motion.div key="x" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-destructive"><X className="h-4 w-4" /></motion.div>
                      )
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={isLogin ? 'md:col-span-2' : ''}>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Access Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className={`auth-input pr-16 transition-all ${!isLogin && isPasswordStrong ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : ''}`}
                    placeholder="••••••••"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {!isLogin && isPasswordStrong && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                        <Check className="h-4 w-4" />
                      </motion.div>
                    )}
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <input 
                      name="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      className={`auth-input pr-16 transition-all ${formData.confirmPassword ? (formData.confirmPassword === formData.password ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-destructive/50 ring-1 ring-destructive/20') : ''}`}
                      placeholder="••••••••" 
                      required 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <AnimatePresence mode="wait">
                        {formData.confirmPassword && (
                          formData.confirmPassword === formData.password ? (
                            <motion.div key="match" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-emerald-500">
                              <Check className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.div key="mismatch" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-destructive">
                              <X className="h-4 w-4" />
                            </motion.div>
                          )
                        )}
                      </AnimatePresence>
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
                <p className="text-[9px] font-mono text-muted-foreground leading-tight">
                  BY REGISTERING, YOU AGREE TO SYSTEM COMPLIANCE REGULATIONS (v2.1) AND ACKNOWLEDGE THAT ALL ACTIONS ARE AUDITED IN REAL-TIME FOR TRANSPARENCY AND SECURITY.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button type="submit" disabled={loading} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-mono font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50">
                {loading ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : (isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />)}
                {isLogin ? "AUTHORIZE ACCESS" : "INITIALIZE ACCOUNT"}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] text-primary hover:underline font-mono uppercase tracking-widest">
              {isLogin ? "Request New Operator Credentials" : "Return to Access Authorization"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
