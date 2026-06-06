import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="p-6 bg-destructive/10 rounded-full">
        <ShieldAlert className="h-16 w-16 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold font-mono tracking-tighter text-foreground">Access Denied</h1>
        <p className="text-muted-foreground font-mono max-w-md mx-auto">
          You do not have the necessary permissions to view this page. Please contact your system administrator if you believe this is an error.
        </p>
      </div>
      <Button 
        onClick={() => navigate("/dashboard")} 
        variant="outline" 
        className="font-mono"
      >
        Return to Dashboard
      </Button>
    </div>
  );
};

export default UnauthorizedPage;
