import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Upload, Stethoscope } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const PROVIDER_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "therapist", label: "Therapist" },
  { value: "dentist", label: "Dentist" },
  { value: "physiotherapist", label: "Physiotherapist" },
  { value: "caretaker", label: "Caretaker" },
  { value: "other", label: "Other" },
];

const CONSULTATION_MODES = [
  { id: "in-person", label: "In-Person" },
  { id: "video", label: "Video Call" },
  { id: "chat", label: "Chat" },
];

const UpgradeToProvider = () => {
  const { user, refreshRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [specialization, setSpecialization] = useState("");
  const [providerType, setProviderType] = useState("");
  const [experienceYears, setExperienceYears] = useState("");

  // Step 2
  const [licenseNumber, setLicenseNumber] = useState("");
  const [consultationModes, setConsultationModes] = useState<string[]>([]);

  // Step 3
  const [file, setFile] = useState<File | null>(null);

  const toggleMode = (mode: string) => {
    setConsultationModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let documentUrl: string | null = null;

      // Upload document if provided
      if (file) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("provider-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        documentUrl = filePath;
      }

      // Create provider profile
      const { error: provError } = await supabase
        .from("provider_profiles")
        .insert({
          user_id: user.id,
          provider_type: providerType || "doctor",
          specialization: specialization || null,
          experience_years: experienceYears ? parseInt(experienceYears) : 0,
          hourly_rate: 0,
          verification_status: "pending",
          license_number: licenseNumber || null,
          consultation_modes: consultationModes.length > 0 ? consultationModes : null,
          verification_document_url: documentUrl,
          verification_submitted_at: new Date().toISOString(),
        } as any);

      if (provError) throw provError;

      // Update role from member to provider
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: "provider" as any })
        .eq("user_id", user.id);

      if (roleError) throw roleError;

      await refreshRole();
      toast({ title: "Application submitted!", description: "Your verification is pending review." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout className="container mx-auto px-4 py-4 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Stethoscope className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Become a Healthcare Professional</h1>
          <p className="text-sm text-muted-foreground">Complete your professional profile</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"
              }`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
            <CardDescription>Tell us about your practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select value={providerType} onValueChange={setProviderType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                placeholder="e.g. Cardiology, Pediatrics"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!providerType}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>License & Consultation</CardTitle>
            <CardDescription>Your credentials and how you consult</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>License Number</Label>
              <Input
                placeholder="Professional license number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>Consultation Modes</Label>
              {CONSULTATION_MODES.map((mode) => (
                <div key={mode.id} className="flex items-center gap-3">
                  <Checkbox
                    id={mode.id}
                    checked={consultationModes.includes(mode.id)}
                    onCheckedChange={() => toggleMode(mode.id)}
                  />
                  <Label htmlFor={mode.id} className="cursor-pointer font-normal">
                    {mode.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Document</CardTitle>
            <CardDescription>Upload a document to verify your credentials (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload license, certificate, or ID
              </p>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="max-w-xs mx-auto"
              />
              {file && (
                <p className="text-sm text-foreground mt-2">{file.name}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default UpgradeToProvider;
