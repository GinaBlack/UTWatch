import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/firebase_config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const PressAndHoldEyeInput = ({ label, value, onChange, placeholder = "" }: any) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="pr-10"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onMouseDown={() => setShow(true)}
          onMouseUp={() => setShow(false)}
          onMouseLeave={() => setShow(false)}
        >
          {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
        </Button>
      </div>
    </div>
  );
};

const SystemSetupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    adminSecretKey: "",
    companySecretKey: "UTWATCH-2026-X",
    boundingBoxDisplay: true,
    displayClasses: ["vehicle", "person"],
    yoloConfidenceThreshold: 0.3,
    collisionIoUThreshold: 0.5,
    audioAlarms: true,
    alertHistoryRetentionDays: 30,
    videoStoragePath: "C:\\Users\\huawei\\Desktop\\UTWatch\\detect_server\\recordings",
    speedLimitKph: 60,
    videoRecordIntervalMinutes: 5,
  });

  const toggleClass = (className: string) => {
    setConfig(prev => ({
      ...prev,
      displayClasses: prev.displayClasses.includes(className)
        ? prev.displayClasses.filter(c => c !== className)
        : [...prev.displayClasses, className]
    }));
  };

  const handleSetup = async () => {
    if (config.adminSecretKey === "0000" || config.adminSecretKey === "") {
      toast({ title: "Error", description: "Please set a secure Admin Secret Key.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      // 1. Notify Backend
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          detection_mode: "both",
          speed_limit: config.speedLimitKph,
          video_storage_path: config.videoStoragePath,
          record_interval: config.videoRecordIntervalMinutes
        }),
      });

      // 2. Save to Firestore
      await setDoc(doc(db, "system", "config"), {
        ...config,
        initialized: true,
      });
      toast({ title: "Setup Complete", description: "System initialized successfully." });
      navigate("/dashboard");
    } catch (error) {
      toast({ title: "Error", description: "Failed to initialize system.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>Configure initial system parameters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <PressAndHoldEyeInput 
              label="Admin Secret Key" 
              value={config.adminSecretKey} 
              onChange={(e: any) => setConfig({...config, adminSecretKey: e.target.value})} 
              placeholder="Secure Key" 
            />
            <PressAndHoldEyeInput 
              label="Company Secret Key" 
              value={config.companySecretKey} 
              onChange={(e: any) => setConfig({...config, companySecretKey: e.target.value})} 
              placeholder="UTWATCH-XXXX-X" 
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Display Bounding Boxes</Label>
            <Switch checked={config.boundingBoxDisplay} onCheckedChange={(checked) => setConfig({...config, boundingBoxDisplay: checked})} />
          </div>

          <div className="space-y-2">
            <Label>Object Classes to Display</Label>
            <div className="flex gap-4 flex-wrap">
              {["vehicle", "person", "animal", "obstacle", "accident"].map(cls => (
                <div key={cls} className="flex items-center space-x-2">
                  <Checkbox id={cls} checked={config.displayClasses.includes(cls)} onCheckedChange={() => toggleClass(cls)} />
                  <label htmlFor={cls} className="text-sm capitalize">{cls}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>YOLO Confidence Threshold (0.0 - 1.0)</Label>
              <Input type="number" step="0.1" value={config.yoloConfidenceThreshold} onChange={(e) => setConfig({...config, yoloConfidenceThreshold: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Collision IoU Threshold (0.0 - 1.0)</Label>
              <Input type="number" step="0.1" value={config.collisionIoUThreshold} onChange={(e) => setConfig({...config, collisionIoUThreshold: parseFloat(e.target.value)})} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Audio Alarms</Label>
            <Switch checked={config.audioAlarms} onCheckedChange={(checked) => setConfig({...config, audioAlarms: checked})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Alert History Retention (Days)</Label>
              <Input type="number" value={config.alertHistoryRetentionDays} onChange={(e) => setConfig({...config, alertHistoryRetentionDays: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Speed Limit (km/h)</Label>
              <Input type="number" value={config.speedLimitKph} onChange={(e) => setConfig({...config, speedLimitKph: parseInt(e.target.value)})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Record Interval (Minutes)</Label>
              <Input type="number" value={config.videoRecordIntervalMinutes} onChange={(e) => setConfig({...config, videoRecordIntervalMinutes: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Video Storage Path</Label>
              <div className="flex gap-2">
                <Input value={config.videoStoragePath} onChange={(e) => setConfig({...config, videoStoragePath: e.target.value})} placeholder="/var/lib/utwatch/videos" />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    (input as any).webkitdirectory = true;
                    input.onchange = (e: any) => {
                      if (e.target.files.length > 0) {
                        toast({ 
                          title: "Note", 
                          description: "Browser security prevents full path access. Please verify the absolute path manually.",
                        });
                      }
                    };
                    input.click();
                  }}
                >
                  Browse
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Note: This must be an absolute path on the server machine where the backend is running.
              </p>
            </div>
          </div>

          <Button onClick={handleSetup} className="w-full" disabled={isSaving}>{isSaving ? "Initializing..." : "Complete Setup"}</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSetupPage;
