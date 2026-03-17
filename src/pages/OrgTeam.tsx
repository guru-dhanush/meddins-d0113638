import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Users } from "lucide-react";
import AddProviderDialog from "@/components/AddProviderDialog";

const OrgTeam = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userRole !== "organization")) navigate("/dashboard");
  }, [loading, user, userRole]);

  useEffect(() => {
    if (!user || userRole !== "organization") return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("organizations").select("id").eq("owner_id", user.id).single().then(({ data }) => {
        if (data) setOrgId(data.id);
        setDataLoading(false);
      });
    });
  }, [user, userRole]);

  if (loading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <AppLayout className="container mx-auto px-4 py-4 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Team Management</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />Add Provider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Providers</CardTitle>
          <CardDescription>Team management features coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Team management will be available soon. You can invite providers via email for now.</p>
          </div>
        </CardContent>
      </Card>

      {orgId && (
        <AddProviderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          organizationId={orgId}
          onAdded={() => { }}
        />
      )}
    </AppLayout>
  );
};

export default OrgTeam;
