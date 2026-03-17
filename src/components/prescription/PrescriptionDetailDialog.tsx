import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Pill, FileText, Download, User, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface PrescriptionItem {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

interface PrescriptionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId: string | null;
}

const PrescriptionDetailDialog = ({ open, onOpenChange, prescriptionId }: PrescriptionDetailDialogProps) => {
  const [prescription, setPrescription] = useState<any>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [providerName, setProviderName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !prescriptionId) return;
    setLoading(true);

    const fetchData = async () => {
      const [{ data: rx }, { data: rxItems }] = await Promise.all([
        supabase.from("prescriptions").select("*").eq("id", prescriptionId).single(),
        supabase.from("prescription_items").select("*").eq("prescription_id", prescriptionId).order("created_at"),
      ]);

      setPrescription(rx);
      setItems((rxItems as PrescriptionItem[]) || []);

      if (rx) {
        // Fetch names
        const [{ data: provProfile }, { data: patProfile }] = await Promise.all([
          supabase.from("provider_profiles").select("user_id").eq("id", (rx as any).provider_id).single(),
          supabase.from("profiles").select("full_name").eq("user_id", (rx as any).patient_id).single(),
        ]);
        setPatientName(patProfile?.full_name || "Patient");
        if (provProfile) {
          const { data: provName } = await supabase.from("profiles").select("full_name").eq("user_id", provProfile.user_id).single();
          setProviderName(provName?.full_name || "Provider");
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [open, prescriptionId]);

  const handleDownloadPDF = () => {
    if (!prescription) return;
    const medsRows = items.map((m, i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:500">${i + 1}. ${m.medication_name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${m.dosage || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${m.frequency || "-"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${m.duration || "-"}</td>
      </tr>
      ${m.instructions ? `<tr><td colspan="4" style="padding:4px 8px 12px;font-size:12px;color:#666;font-style:italic">↳ ${m.instructions}</td></tr>` : ""}
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><title>Prescription</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; padding:40px; color:#1a1a1a; max-width:700px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:3px solid #0ea5e9; padding-bottom:16px; }
  .header h1 { font-size:24px; color:#0ea5e9; }
  .rx-symbol { font-size:40px; color:#0ea5e9; font-weight:bold; font-family:serif; }
  .section { margin-bottom:20px; }
  .section h3 { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:8px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .info-item .label { font-size:11px; color:#888; }
  .info-item .value { font-size:14px; font-weight:500; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; padding:10px 8px; background:#f8f9fa; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#666; border-bottom:2px solid #dee2e6; }
  .notes { background:#f8f9fa; padding:12px 16px; border-radius:8px; font-size:13px; color:#555; }
  .footer { margin-top:40px; text-align:center; font-size:11px; color:#aaa; border-top:1px solid #eee; padding-top:16px; }
  .badge { display:inline-block; background:#dbeafe; color:#1d4ed8; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600; }
  @media print { body { padding:20px; } }
</style></head>
<body>
  <div class="header">
    <div>
      <div class="rx-symbol">℞</div>
      <h1>Prescription</h1>
      <p style="color:#666;font-size:12px;margin-top:4px">Meddin Health Platform</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#666">
      <p>Date: ${format(new Date(prescription.created_at), "PPP")}</p>
      <p>Rx #${prescription.id.slice(0, 8).toUpperCase()}</p>
    </div>
  </div>

  <div class="section">
    <h3>Patient & Provider</h3>
    <div class="info-grid">
      <div class="info-item"><div class="label">Patient</div><div class="value">${patientName}</div></div>
      <div class="info-item"><div class="label">Provider</div><div class="value">Dr. ${providerName}</div></div>
      <div class="info-item"><div class="label">Diagnosis</div><div class="value">${prescription.diagnosis || "-"}</div></div>
    </div>
  </div>

  <div class="section">
    <h3>Medications</h3>
    <table>
      <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
      <tbody>${medsRows}</tbody>
    </table>
  </div>

  ${prescription.notes ? `<div class="section"><h3>Notes</h3><div class="notes">${prescription.notes}</div></div>` : ""}

  <div class="footer">
    <p>This is a digitally generated prescription from Meddin. Please consult your healthcare provider for any questions.</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  if (!prescriptionId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl font-serif text-primary">℞</span>
            Prescription Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : prescription ? (
          <div className="space-y-4">
            {/* Info */}
            <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Provider</span>
                </div>
                <span className="font-medium">Dr. {providerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Patient</span>
                </div>
                <span className="font-medium">{patientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{format(new Date(prescription.created_at), "PPP")}</span>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
              <p className="text-sm font-semibold">{prescription.diagnosis}</p>
            </div>

            {/* Medications */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5" /> Medications ({items.length})
              </p>
              {items.map((item, i) => (
                <div key={item.id} className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-sm font-semibold">{i + 1}. {item.medication_name}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.dosage && <Badge variant="secondary">{item.dosage}</Badge>}
                    {item.frequency && <Badge variant="outline">{item.frequency}</Badge>}
                    {item.duration && <Badge variant="outline">{item.duration}</Badge>}
                  </div>
                  {item.instructions && (
                    <p className="text-xs text-muted-foreground italic mt-1">↳ {item.instructions}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            {prescription.notes && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{prescription.notes}</p>
              </div>
            )}

            {/* Download */}
            <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" /> Download / Print Prescription
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Prescription not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionDetailDialog;
