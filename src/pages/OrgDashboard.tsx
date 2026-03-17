import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Settings, UserPlus, Loader2, ClipboardList } from "lucide-react";

type OrgData = {
  id: string;
  name: string;
  description: string | null;
};

const OrgDashboard = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== "organization")) {
      navigate("/dashboard");
    }
  }, [loading, user, userRole, navigate]);

  useEffect(() => {
    if (!user || userRole !== "organization") return;

    const fetchData = async () => {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, description")
        .eq("owner_id", user.id)
        .single();

      if (orgData) setOrg(orgData);
      setDataLoading(false);
    };

    fetchData();
  }, [user, userRole]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout className="container mx-auto px-4 py-4">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">
        {org?.name || "Organization Dashboard"}
      </h1>
      <p className="text-muted-foreground mb-8">Manage your organization</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Operational</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quick Actions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/org/profile/edit"><Settings className="h-4 w-4 mr-2" />Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default OrgDashboard;
