import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";

type OrgInfo = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
};

const OrgProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      if (!id) return;
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, description, logo_url")
        .eq("id", id)
        .single();

      if (orgData) setOrg(orgData);
      setLoading(false);
    };
    fetchOrg();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!org) {

    return (
      <AppLayout className="container mx-auto px-4 py-4 text-center">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Organization not found</h1>
      </AppLayout>
    );
  }

  return (
    <AppLayout className="container mx-auto px-4 py-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-xl bg-card border shadow-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="h-8 w-8 text-primary" />
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{org.name}</h1>
        </div>
      </div>
      {org.description && <p className="text-muted-foreground mb-4">{org.description}</p>}
    </AppLayout>
  );
};

export default OrgProfile;
