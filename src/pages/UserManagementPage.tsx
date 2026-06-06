import { useState, useEffect } from "react";
import { Users, Shield, Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { db } from "../firebase/firebase_config";
import { collection, query, getDocs, doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { logSystemAction } from "../lib/audit";
import { useAuth } from "@/components/ThemeProvider";

const UserManagementPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string, userName: string) => {
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      
      if (currentUser) {
        await logSystemAction({
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: "USER_UPDATE_ROLE",
          resource: `USER:${uid}`,
          details: `Administrator ${currentUser.name} updated role for ${userName} (${uid}) to ${newRole}`
        });
      }

      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-tight">User Management</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Administrator Control Panel</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-bold font-mono uppercase">
            <Users className="h-4 w-4 text-primary" /> Registered Operators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-[10px] font-mono uppercase">Name</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Email</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Current Role</TableHead>
                  <TableHead className="text-[10px] font-mono uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border/50">
                    <TableCell className="font-bold font-mono text-xs">{user.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{user.email}</TableCell>
                    <TableCell>
                      <Select 
                        defaultValue={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value, user.fullName)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-[10px] font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card font-mono text-[10px]">
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Traffic Officer">Traffic Officer</SelectItem>
                          <SelectItem value="Emergency Responder">Emergency Responder</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 text-primary">
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;
