import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Pill, Download, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PrescriptionDetailDialog from "./PrescriptionDetailDialog";

interface Prescription {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  created_at: string;
  booking_id: string | null;
  provider_id: string;
  providerName?: string;
}

const PrescriptionList = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (data?.length) {
        // Fetch provider names
        const providerIds = [...new Set(data.map((r: any) => r.provider_id))];
        const { data: pps } = await supabase.from("provider_profiles").select("id, user_id").in("id", providerIds);
        const userIds = pps?.map(p => p.user_id) || [];
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const ppMap = new Map(pps?.map(p => [p.id, p.user_id]) || []);
        const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        setPrescriptions(data.map((r: any) => ({
          ...r,
          providerName: nameMap.get(ppMap.get(r.provider_id) || "") || "Provider",
        })));
      } else {
        setPrescriptions([]);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Pill className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No prescriptions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Prescriptions from your providers will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {prescriptions.map((rx) => (
          <Card
            key={rx.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setSelectedId(rx.id); setDetailOpen(true); }}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-serif text-primary">℞</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{rx.diagnosis || "Prescription"}</p>
                <p className="text-xs text-muted-foreground">
                  Dr. {rx.providerName} · {format(new Date(rx.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <PrescriptionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        prescriptionId={selectedId}
      />
    </>
  );
};

export default PrescriptionList;
