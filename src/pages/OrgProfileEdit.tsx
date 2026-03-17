import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const OrgProfileEdit = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== "organization")) navigate("/dashboard");
  }, [loading, user, userRole]);

  useEffect(() => {
    if (!user || userRole !== "organization") return;
    supabase.from("organizations").select("*").eq("owner_id", user.id).single().then(({ data }) => {
      if (data) {
        setOrgId(data.id);
        setForm({
          name: data.name || "",
          description: data.description || "",
          logo_url: data.logo_url || "",
        });
      }
      setDataLoading(false);
    });
  }, [user, userRole]);

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({
      name: form.name,
      description: form.description,
      logo_url: form.logo_url || null,
    }).eq("id", orgId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Organization profile updated!" });
    }
    setSaving(false);
  };

  if (loading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <AppLayout className="container mx-auto px-4 py-4 max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Edit Organization Profile</h1>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div>
            <Label>Organization Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full mt-6" size="lg">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
      </Button>
    </AppLayout>
  );
};

export default OrgProfileEdit;
