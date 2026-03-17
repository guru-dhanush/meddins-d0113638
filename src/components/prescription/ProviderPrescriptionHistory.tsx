import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Pill, Eye, Loader2, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PrescriptionDetailDialog from "./PrescriptionDetailDialog";

interface Prescription {
  id: string;
  diagnosis: string | null;
  created_at: string;
  patient_id: string;
  patientName?: string;
}

const ProviderPrescriptionHistory = ({ providerId }: { providerId: string }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });

      if (data?.length) {
        const patientIds = [...new Set(data.map((r: any) => r.patient_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds);
        const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        setPrescriptions(data.map((r: any) => ({
          ...r,
          patientName: nameMap.get(r.patient_id) || "Patient",
        })));
      } else {
        setPrescriptions([]);
      }
      setLoading(false);
    };
    fetch();
  }, [providerId]);

  const displayed = expanded ? prescriptions : prescriptions.slice(0, 5);

  return (
    <Card>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Prescription History</h3>
          {prescriptions.length > 0 && (
            <Badge variant="secondary" className="text-xs">{prescriptions.length}</Badge>
          )}
        </div>
      </div>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-8 text-center">
            <Pill className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No prescriptions issued yet</p>
          </div>
        ) : (
          <>
            {displayed.map((rx) => (
              <div
                key={rx.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => { setSelectedId(rx.id); setDetailOpen(true); }}
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-serif text-primary">℞</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rx.diagnosis || "Prescription"}</p>
                  <p className="text-xs text-muted-foreground">{rx.patientName} · {format(new Date(rx.created_at), "MMM d, yyyy")}</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
            {prescriptions.length > 5 && (
              <div className="px-4 py-2 text-center">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpanded(!expanded)}>
                  {expanded ? "Show less" : `View all ${prescriptions.length} prescriptions`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      <PrescriptionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        prescriptionId={selectedId}
      />
    </Card>
  );
};

export default ProviderPrescriptionHistory;
