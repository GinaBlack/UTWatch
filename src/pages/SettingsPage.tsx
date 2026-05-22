import { useState, useEffect } from "react";
import { 
  Settings, 
  Shield, 
  Database, 
  Save, 
  Smartphone, 
  BrainCircuit,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { toast } = useToast();
  const [detectionMode, setDetectionMode] = useState<string>("both");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/settings');
        if (response.ok) {
          const data = await response.json();
          setDetectionMode(data.detection_mode);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection_mode: detectionMode }),
      });
      
      if (response.ok) {
        toast({
          title: "Settings Updated",
          description: `Detection mode set to ${detectionMode.toUpperCase()}. Note: This update requires a backend restart in some environments to fully apply to the worker process.`,
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not connect to the backend settings API.",
        variant: "destructive",
      });
    }
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
        <Button onClick={handleSaveSettings} className="gap-2 font-mono text-xs">
          <Save className="h-4 w-4" />
          COMMIT CHANGES
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Computer Vision Settings */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-mono uppercase">Detection Engine</CardTitle>
              </div>
              <CardDescription className="text-[10px] font-mono uppercase">Configure accident detection methodology</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Accident Detection Mode</Label>
                <Select value={detectionMode} onValueChange={setDetectionMode} disabled={isLoading}>
                  <SelectTrigger className="bg-secondary/50 border-none font-mono text-xs h-10">
                    <SelectValue placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent className="font-mono text-xs">
                    <SelectItem value="ai">🧠 AI Classifier Only (ConvLSTM)</SelectItem>
                    <SelectItem value="rulebased">📏 Rule-Based Only (IoU/Speed)</SelectItem>
                    <SelectItem value="both">⚡ Hybrid Mode (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground font-mono mt-2 bg-secondary/30 p-2 rounded italic">
                  {detectionMode === 'ai' && "AI Mode uses a deep learning ConvLSTM model to analyze video temporal dynamics."}
                  {detectionMode === 'rulebased' && "Rule-Based mode uses physical geometry and object tracking metrics."}
                  {detectionMode === 'both' && "Hybrid mode combines both methods for maximum detection accuracy."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 opacity-50 cursor-not-allowed">
                  <Label className="text-[10px] font-mono uppercase text-muted-foreground">YOLO Confidence Threshold</Label>
                  <Input value="0.30" readOnly className="bg-secondary/50 border-none font-mono text-xs" />
                </div>
                <div className="space-y-2 opacity-50 cursor-not-allowed">
                  <Label className="text-[10px] font-mono uppercase text-muted-foreground">Collision IoU Threshold</Label>
                  <Input value="0.50" readOnly className="bg-secondary/50 border-none font-mono text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Core System Settings */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm opacity-80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold font-mono uppercase">Interface Parameters</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="space-y-0.5">
                  <Label className="text-xs font-mono uppercase">Adaptive Bitrate</Label>
                  <p className="text-[10px] text-muted-foreground font-mono">Optimize stream quality based on bandwidth</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="space-y-0.5">
                  <Label className="text-xs font-mono uppercase">Enhanced Overlays</Label>
                  <p className="text-[10px] text-muted-foreground font-mono">Render high-fidelity bounding boxes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-mono uppercase">Audio Alarms</Label>
                  <p className="text-[10px] text-muted-foreground font-mono">Play audible alert when incident is detected</p>
                </div>
                <Switch defaultChecked />
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
              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">API Access Key</Label>
                <Input value="••••••••••••••••" type="password" readOnly className="bg-secondary/50 border-none font-mono text-xs" />
              </div>
              <Button variant="outline" className="w-full text-[10px] font-mono uppercase h-8">Rotate Keys</Button>
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
              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase text-muted-foreground">Alert History (Days)</Label>
                <Input value="30" type="number" readOnly className="bg-secondary/50 border-none font-mono text-xs" />
              </div>
              <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-[10px] font-mono uppercase h-8">Purge Old Records</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
