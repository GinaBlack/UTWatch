import { Clock } from "lucide-react";

const SystemUnderSetupPage = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="p-6 bg-primary/10 rounded-full">
        <Clock className="h-16 w-16 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold font-mono tracking-tighter text-foreground">System Under Setup</h1>
        <p className="text-muted-foreground font-mono max-w-md mx-auto">
          The system is currently being initialized by an administrator. Please wait and try again later.
        </p>
      </div>
    </div>
  );
};

export default SystemUnderSetupPage;
