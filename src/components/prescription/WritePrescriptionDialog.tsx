import { useState } from "react";
import { Plus, Trash2, Pill, ClipboardPlus, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface MedicationEntry {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const emptyMed: MedicationEntry = { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" };

interface WritePrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  providerId: string; // provider_profiles.id
  patientId: string;  // auth user id of patient
  patientName: string;
  onCreated?: () => void;
}

const WritePrescriptionDialog = ({
  open, onOpenChange, bookingId, providerId, patientId, patientName, onCreated,
}: WritePrescriptionDialogProps) => {
  const { toast } = useToast();
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<MedicationEntry[]>([{ ...emptyMed }]);
  const [saving, setSaving] = useState(false);

  // Follow-up
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [autoBook, setAutoBook] = useState(false);

  const addMed = () => setMedications([...medications, { ...emptyMed }]);
  const removeMed = (i: number) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof MedicationEntry, value: string) => {
    const updated = [...medications];
    updated[i] = { ...updated[i], [field]: value };
    setMedications(updated);
  };

  const handleSave = async () => {
    if (!diagnosis.trim()) {
      toast({ title: "Diagnosis required", variant: "destructive" });
      return;
    }
    const validMeds = medications.filter(m => m.medication_name.trim());
    if (validMeds.length === 0) {
      toast({ title: "Add at least one medication", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Create prescription
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert({
          booking_id: bookingId,
          provider_id: providerId,
          patient_id: patientId,
          diagnosis: diagnosis.trim(),
          notes: notes.trim() || null,
        } as any)
        .select("id")
        .single();

      if (rxErr || !rx) throw rxErr || new Error("Failed to create prescription");

      // Insert medications
      const items = validMeds.map(m => ({
        prescription_id: (rx as any).id,
        medication_name: m.medication_name.trim(),
        dosage: m.dosage.trim() || null,
        frequency: m.frequency.trim() || null,
        duration: m.duration.trim() || null,
        instructions: m.instructions.trim() || null,
      }));

      const { error: itemsErr } = await supabase.from("prescription_items").insert(items as any);
      if (itemsErr) throw itemsErr;

      // Create follow-up if requested
      if (scheduleFollowUp && followUpDate) {
        const followUpData: any = {
          booking_id: bookingId,
          provider_id: providerId,
          patient_id: patientId,
          follow_up_date: followUpDate,
          reason: followUpReason.trim() || null,
          auto_booked: autoBook,
        };

        if (autoBook) {
          // Auto-create a new pending booking
          const { data: newBooking } = await supabase
            .from("bookings")
            .insert({
              provider_id: providerId,
              patient_id: patientId,
              booking_date: followUpDate,
              booking_time: "09:00",
              status: "pending",
              notes: `Follow-up: ${followUpReason || "Scheduled follow-up"}`,
            })
            .select("id")
            .single();

          if (newBooking) {
            followUpData.new_booking_id = newBooking.id;
            followUpData.status = "booked";
          }
        }

        await supabase.from("follow_ups").insert(followUpData);
      }

      // Notify patient
      supabase.functions.invoke("create-notification", {
        body: {
          user_id: patientId,
          title: "New Prescription",
          message: `A prescription has been issued for your recent appointment. Diagnosis: ${diagnosis.trim()}`,
          type: "prescription",
          metadata: { prescription_id: (rx as any).id, booking_id: bookingId },
        },
      }).catch(console.error);

      toast({ title: "Prescription created successfully" });
      onCreated?.();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDiagnosis("");
    setNotes("");
    setMedications([{ ...emptyMed }]);
    setScheduleFollowUp(false);
    setFollowUpDate("");
    setFollowUpReason("");
    setAutoBook(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="h-5 w-5 text-primary" />
            Write Prescription
          </DialogTitle>
          <p className="text-sm text-muted-foreground">For {patientName}</p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Diagnosis */}
          <div className="space-y-2">
            <Label>Diagnosis *</Label>
            <Input
              placeholder="e.g. Acute pharyngitis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          {/* Medications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-primary" /> Medications
              </Label>
              <Button variant="ghost" size="sm" onClick={addMed} className="text-xs h-7">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>

            {medications.map((med, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
                {medications.length > 1 && (
                  <button
                    onClick={() => removeMed(i)}
                    className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <Input
                  placeholder="Medication name *"
                  value={med.medication_name}
                  onChange={(e) => updateMed(i, "medication_name", e.target.value)}
                  className="text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Dosage"
                    value={med.dosage}
                    onChange={(e) => updateMed(i, "dosage", e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => updateMed(i, "frequency", e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => updateMed(i, "duration", e.target.value)}
                    className="text-sm"
                  />
                </div>
                <Input
                  placeholder="Special instructions (optional)"
                  value={med.instructions}
                  onChange={(e) => updateMed(i, "instructions", e.target.value)}
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional notes for the patient..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Follow-up */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <CalendarPlus className="h-4 w-4 text-primary" /> Schedule Follow-up
              </Label>
              <Switch checked={scheduleFollowUp} onCheckedChange={setScheduleFollowUp} />
            </div>

            {scheduleFollowUp && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Follow-up Date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reason</Label>
                  <Input
                    placeholder="e.g. Check recovery progress"
                    value={followUpReason}
                    onChange={(e) => setFollowUpReason(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-create booking</p>
                    <p className="text-xs text-muted-foreground">Creates a pending booking for the patient</p>
                  </div>
                  <Switch checked={autoBook} onCheckedChange={setAutoBook} />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Issue Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WritePrescriptionDialog;
