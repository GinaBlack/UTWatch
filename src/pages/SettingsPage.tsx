import { useState, useEffect } from "react";
import { 
  Settings, 
  Shield, 
  Database, 
  Save, 
  Smartphone, 
  BrainCircuit,
  Cpu,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/ThemeProvider";
import { useSystemConfig, SystemConfig } from "@/hooks/use-system-config";
import { logSystemAction } from "@/lib/audit";

const PressAndHoldEyeInput = ({ label, value, onChange, readOnly = false, placeholder = "" }: any) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className="bg-secondary/50 border-none font-mono text-xs pr-10"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onMouseDown={() => setShow(true)}
          onMouseUp={() => setShow(false)}
          onMouseLeave={() => setShow(false)}
        >
          {show ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
        </Button>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { config: remoteConfig, loading } = useSystemConfig();
  const [localConfig, setLocalConfig] = useState<SystemConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (remoteConfig) setLocalConfig(remoteConfig);
  }, [remoteConfig]);

  if (loading || !localConfig) return <div>Loading...</div>;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Update Backend
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          detection_mode: "both", // Keep current mode
          speed_limit: localConfig.speedLimitKph,
          video_storage_path: localConfig.videoStoragePath,
          record_interval: localConfig.videoRecordIntervalMinutes,
          enable_overspeeding_alerts: localConfig.enableOverspeedingAlerts
        }),
      });

      // 2. Update Firestore
      await setDoc(doc(db, "system", "config"), localConfig, { merge: true });

      await logSystemAction({
        userId: user?.uid || "unknown",
        userName: user?.name || user?.email || "Unknown",
        userRole: user?.role || "Unknown",
        action: "UPDATE_SYSTEM_CONFIG",
        resource: "SYSTEM_SETTINGS",
        details: `System configuration updated by ${user?.name}. Changes: Mode=both, Speed=${localConfig.speedLimitKph}, Interval=${localConfig.videoRecordIntervalMinutes}`
      });
      toast({
        title: "Settings Updated",
        description: "Configuration synchronized successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleClass = (className: string) => {
    setLocalConfig(prev => prev ? ({
      ...prev,
      displayClasses: prev.displayClasses.includes(className)
        ? prev.displayClasses.filter(c => c !== className)
        : [...prev.displayClasses, className]
    }) : null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono-display uppercase tracking-tight">System Configuration</h1>
            <p className="text-xs text-muted-foreground font-mono">Fine-tune computer vision and network parameters</p>
          </div>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2 font-mono text-xs">
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "SAVING..." : "COMMIT CHANGES"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-mono uppercase">Detection Engine</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>YOLO Confidence Threshold</Label>
                  <Input type="number" step="0.1" value={localConfig.yoloConfidenceThreshold} onChange={(e) => setLocalConfig({...localConfig, yoloConfidenceThreshold: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Collision IoU Threshold</Label>
                  <Input type="number" step="0.1" value={localConfig.collisionIoUThreshold} onChange={(e) => setLocalConfig({...localConfig, collisionIoUThreshold: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Display Bounding Boxes</Label>
                <Switch checked={localConfig.boundingBoxDisplay} onCheckedChange={(checked) => setLocalConfig({...localConfig, boundingBoxDisplay: checked})} />
              </div>
              <div className="space-y-2">
                <Label>Object Classes to Display</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {["car", "truck", "motorcycle", "bus", "person", "animal", "obstacle", "accident", "license plate"].map(cls => (
                    <div key={cls} className="flex items-center space-x-2">
                      <Checkbox id={cls} checked={localConfig.displayClasses.includes(cls)} onCheckedChange={() => toggleClass(cls)} />
                      <label htmlFor={cls} className="text-sm capitalize">{cls}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm opacity-80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-mono uppercase">Interface Parameters</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <Label>Audio Alarms</Label>
                <Switch checked={localConfig.audioAlarms} onCheckedChange={(checked) => setLocalConfig({...localConfig, audioAlarms: checked})} />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label>Enable Overspeeding Alerts</Label>
                <Switch checked={localConfig.enableOverspeedingAlerts} onCheckedChange={(checked) => setLocalConfig({...localConfig, enableOverspeedingAlerts: checked})} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 bg-secondary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-mono uppercase">Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <PressAndHoldEyeInput 
                label="Admin Secret Key" 
                value={localConfig.adminSecretKey} 
                onChange={(e: any) => setLocalConfig({...localConfig, adminSecretKey: e.target.value})} 
                placeholder="New Secure Key" 
              />
              <PressAndHoldEyeInput 
                label="Company Secret Key" 
                value={localConfig.companySecretKey} 
                onChange={(e: any) => setLocalConfig({...localConfig, companySecretKey: e.target.value})} 
                placeholder="UTWATCH-XXXX-X"
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-secondary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-mono uppercase">Data Retention</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Alert History Retention (Days)</Label>
                  <Input type="number" value={localConfig.alertHistoryRetentionDays} onChange={(e) => setLocalConfig({...localConfig, alertHistoryRetentionDays: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Speed Limit (km/h)</Label>
                  <Input type="number" value={localConfig.speedLimitKph || 60} onChange={(e) => setLocalConfig({...localConfig, speedLimitKph: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Record Interval (Min)</Label>
                  <Input type="number" value={localConfig.videoRecordIntervalMinutes || 5} onChange={(e) => setLocalConfig({...localConfig, videoRecordIntervalMinutes: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Video Storage Path</Label>
                <div className="flex gap-2">
                  <Input 
                    value={localConfig.videoStoragePath} 
                    onChange={(e) => setLocalConfig({...localConfig, videoStoragePath: e.target.value})} 
                    placeholder="e.g. C:\Users\Admin\Videos\UTWatch"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.webkitdirectory = true;
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          // Note: Browsers restrict full path access for security, 
                          // but this gives a visual directory selection experience.
                          // We'll simulate path construction or notify user.
                          toast({ title: "Note", description: "Path selection is illustrative. Ensure backend has read/write access to this directory." });
                        }
                      };
                      input.click();
                    }}
                  >
                    Browse
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
