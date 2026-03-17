import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
    Stethoscope, UserRound, Loader2, Upload, FileText,
    ArrowRight, ArrowLeft, Check, SkipForward, Sparkles, X,
    Syringe, Brain, HeartHandshake, Pill
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`;

// ─── Provider type definitions ─────────────────────────────────────────────
const PROVIDER_TYPES = [
    { value: "doctor", label: "Doctor", icon: Stethoscope, desc: "Physician, surgeon, specialist" },
    { value: "nurse", label: "Nurse", icon: Syringe, desc: "Registered nurse, practitioner" },
    { value: "therapist", label: "Therapist", icon: Brain, desc: "Psychologist, physiotherapist" },
    { value: "caregiver", label: "Caregiver", icon: HeartHandshake, desc: "Home care, elderly care" },
    { value: "other", label: "Other", icon: Pill, desc: "Pharmacist, dietitian, etc." },
] as const;

type ProviderType = typeof PROVIDER_TYPES[number]["value"];

// ─── Which fields show for each provider type ──────────────────────────────
const FIELD_MAP: Record<ProviderType, string[]> = {
    doctor: ["bio", "specializations", "license_number", "experience_years", "education", "certifications", "consultation_fee", "city", "phone"],
    nurse: ["bio", "specializations", "license_number", "experience_years", "education", "certifications", "consultation_fee", "city", "phone"],
    therapist: ["bio", "specializations", "experience_years", "education", "certifications", "consultation_fee", "city", "phone"],
    caregiver: ["bio", "experience_years", "services_offered", "city", "phone"],
    other: ["bio", "specializations", "experience_years", "consultation_fee", "services_offered", "city", "phone"],
};

const FIELD_LABELS: Record<string, { label: string; placeholder: string; type?: string; rows?: number }> = {
    bio: { label: "Professional Bio", placeholder: "Brief professional summary...", rows: 3 },
    specializations: { label: "Specializations", placeholder: "e.g. Cardiology, Pediatrics" },
    license_number: { label: "License Number", placeholder: "e.g. MCI-12345" },
    experience_years: { label: "Years of Experience", placeholder: "e.g. 5", type: "number" },
    education: { label: "Education", placeholder: "e.g. MBBS - AIIMS Delhi" },
    certifications: { label: "Certifications", placeholder: "e.g. MD, FRCS" },
    consultation_fee: { label: "Consultation Fee", placeholder: "e.g. 500", type: "number" },
    services_offered: { label: "Services Offered", placeholder: "e.g. Home visits, Post-op care" },
    city: { label: "City", placeholder: "e.g. Mumbai" },
    phone: { label: "Phone", placeholder: "e.g. +91 98765 43210" },
};

// ═════════════════════════════════════════════════════════════════════════════
const Onboarding = () => {
    const { user, refreshRole, userRole, onboardingCompleted, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // ─── State ─────────────────────────────────────────────────────────────
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [role, setRole] = useState<"member" | "provider" | null>(null);
    const [providerType, setProviderType] = useState<ProviderType | null>(null);
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);

    // Provider form
    const [form, setForm] = useState<Record<string, string>>({});
    const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

    // CV upload
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [parsed, setParsed] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // ─── Edge Case: Guards ─────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        if (!user) { navigate("/auth"); return; }
        if (onboardingCompleted === true) {
            navigate(userRole === "provider" ? "/dashboard" : "/feed");
            return;
        }
    }, [authLoading, user, onboardingCompleted, userRole, navigate]);

    // ─── Edge Case: Resume from DB state ───────────────────────────────────
    useEffect(() => {
        if (!user || authLoading) return;
        let cancelled = false;

        const deriveStep = async () => {
            try {
                // Check if role already exists
                const { data: roleData } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (cancelled) return;

                if (!roleData) {
                    // Brand new user — start at Step 1
                    setStep(1);
                    setInitLoading(false);
                    return;
                }

                const existingRole = roleData.role === "patient" ? "member" : roleData.role;
                setRole(existingRole as "member" | "provider");

                if (existingRole === "member") {
                    // Seeking care but onboarding not marked done (edge case)
                    setStep(1);
                    setInitLoading(false);
                    return;
                }

                // Provider — check if provider_type and profile data exist
                const { data: pp } = await (supabase as any)
                    .from("provider_profiles")
                    .select("provider_type, bio, specializations, experience_years, city")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (cancelled) return;

                if (!pp) {
                    // Role is provider but no provider_profiles row yet
                    setStep(2);
                    setInitLoading(false);
                    return;
                }

                setProviderType(pp.provider_type as ProviderType);

                // If they have meaningful profile data, go to Step 3 (can review/finish)
                // If just default row, go to Step 2 for type selection
                const hasData = pp.bio || pp.city || (pp.experience_years && pp.experience_years > 0);
                if (hasData) {
                    // Pre-fill form with existing data
                    setForm({
                        bio: pp.bio || "",
                        city: pp.city || "",
                        ...(pp.specializations ? { specializations: Array.isArray(pp.specializations) ? pp.specializations.join(", ") : String(pp.specializations) } : {}),
                        ...(pp.experience_years ? { experience_years: String(pp.experience_years) } : {}),
                    });
                    setStep(3);
                } else {
                    setStep(2);
                }
            } catch (err) {
                console.error("deriveStep error:", err);
                // Fallback: show Step 1
                if (!cancelled) setStep(1);
            }
            if (!cancelled) setInitLoading(false);
        };

        deriveStep();
        return () => { cancelled = true; };
    }, [user, authLoading]);

    // ─── Step 1: Save role ─────────────────────────────────────────────────
    const handleRoleContinue = async () => {
        if (!role || !user) return;
        setLoading(true);
        try {
            // Check if role exists, then insert or update
            const { data: existingRole } = await supabase
                .from("user_roles")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();

            if (existingRole) {
                const { error: roleError } = await supabase
                    .from("user_roles")
                    .update({ role: role as any })
                    .eq("user_id", user.id);
                if (roleError) throw roleError;
            } else {
                const { error: roleError } = await supabase
                    .from("user_roles")
                    .insert({ user_id: user.id, role: role as any });
                if (roleError) throw roleError;
            }

            // Update profile with metadata from auth (Google name/avatar)
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
            await supabase
                .from("profiles")
                .update({ full_name: fullName, avatar_url: avatarUrl })
                .eq("user_id", user.id);

            if (role === "member") {
                // Seeking care — done immediately
                await completeOnboarding();
            } else {
                // Provider — create provider_profiles row if not exists
                const { data: existing } = await supabase
                    .from("provider_profiles")
                    .select("id")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (!existing) {
                    await supabase
                        .from("provider_profiles")
                        .insert({
                            user_id: user.id,
                            provider_type: "doctor",
                            hourly_rate: 0,
                            verification_status: "none",
                        } as any);
                }

                await refreshRole();
                setStep(2);
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 2: Save provider type ────────────────────────────────────────
    const handleTypeContinue = async () => {
        if (!providerType || !user) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("provider_profiles")
                .update({ provider_type: providerType } as any)
                .eq("user_id", user.id);
            if (error) throw error;
            setStep(3);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 3: Save provider profile ─────────────────────────────────────
    const handleSaveProvider = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const updateData: any = {};
            if (form.bio) updateData.bio = form.bio;
            if (form.specializations) {
                updateData.specializations = form.specializations.split(",").map(s => s.trim()).filter(Boolean);
            }
            if (form.experience_years) updateData.experience_years = parseInt(form.experience_years) || 0;
            if (form.education) {
                updateData.education = form.education.split(",").map(e => ({ institution: e.trim() }));
            }
            if (form.certifications) {
                updateData.certifications = form.certifications.split(",").map(c => c.trim()).filter(Boolean);
            }
            if (form.consultation_fee) updateData.consultation_fee = parseFloat(form.consultation_fee) || 0;
            if (form.city) updateData.city = form.city;
            if (form.phone) updateData.phone = form.phone;
            if (form.license_number) updateData.license_number = form.license_number;
            if (form.services_offered) updateData.services_offered = form.services_offered;

            const { error } = await supabase
                .from("provider_profiles")
                .update(updateData)
                .eq("user_id", user.id);
            if (error) throw error;

            await completeOnboarding();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // ─── Complete onboarding ───────────────────────────────────────────────
    const completeOnboarding = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ onboarding_completed: true } as any)
                .eq("user_id", user.id);
            if (error) throw error;
            await refreshRole();
            navigate(role === "provider" ? "/dashboard" : "/feed");
        } catch (err: any) {
            toast({ title: "Error completing setup", description: err.message, variant: "destructive" });
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            await completeOnboarding();
        } finally {
            setLoading(false);
        }
    };

    // ─── CV Upload + AI Parse ──────────────────────────────────────────────
    const handleCvUpload = async () => {
        if (!cvFile || !user) return;
        setParsing(true);
        try {
            const arrayBuffer = await cvFile.arrayBuffer();
            const textContent = await extractTextFromPdf(arrayBuffer);

            if (!textContent || textContent.length < 20) {
                sonnerToast.error("Could not extract text from PDF. Please fill in manually.");
                setParsing(false);
                return;
            }

            const systemPrompt = `You are a resume/CV parser for healthcare professionals. Extract the following fields from the provided CV text and return ONLY a valid JSON object with these exact keys:
{
  "bio": "A brief professional summary (max 300 chars)",
  "specializations": "Comma-separated list of medical specializations",
  "experience_years": "Number of years of experience (integer)",
  "education": "Key education details, comma-separated",
  "certifications": "Comma-separated certifications",
  "consultation_fee": "Consultation fee if mentioned (number only, 0 if not found)",
  "city": "City if mentioned",
  "phone": "Phone number if mentioned",
  "license_number": "Medical license number if mentioned"
}
Return ONLY the JSON object, no markdown, no explanation.`;

            const resp = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Parse this CV:\n\n${textContent.slice(0, 4000)}` },
                    ],
                }),
            });

            if (!resp.ok) throw new Error("Failed to parse CV");

            let result = "";
            const reader = resp.body?.getReader();
            const decoder = new TextDecoder();
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    for (const line of chunk.split("\n")) {
                        if (!line.startsWith("data: ")) continue;
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr === "[DONE]") break;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) result += content;
                        } catch { /* partial JSON */ }
                    }
                }
            }

            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                setForm({
                    bio: data.bio || "",
                    specializations: data.specializations || "",
                    experience_years: String(data.experience_years || ""),
                    education: data.education || "",
                    certifications: data.certifications || "",
                    consultation_fee: String(data.consultation_fee || ""),
                    city: data.city || "",
                    phone: data.phone || "",
                    license_number: data.license_number || "",
                });
                setParsed(true);
                sonnerToast.success("CV parsed! Review and adjust the details below.");
            } else {
                throw new Error("Could not parse AI response");
            }
        } catch (err: any) {
            sonnerToast.error(err.message || "Failed to parse CV");
        } finally {
            setParsing(false);
        }
    };

    const extractTextFromPdf = async (buffer: ArrayBuffer): Promise<string> => {
        const bytes = new Uint8Array(buffer);
        let text = "";
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const raw = decoder.decode(bytes);
        const btEtRegex = /BT\s([\s\S]*?)ET/g;
        let match;
        while ((match = btEtRegex.exec(raw)) !== null) {
            const block = match[1];
            const strRegex = /\(([^)]*)\)/g;
            let strMatch;
            while ((strMatch = strRegex.exec(block)) !== null) {
                text += strMatch[1] + " ";
            }
        }
        if (text.trim().length < 50) {
            const allStrings = raw.match(/\(([^)]{2,})\)/g) || [];
            text = allStrings.map(s => s.slice(1, -1)).join(" ");
        }
        return text.trim();
    };

    // ─── Loading states ────────────────────────────────────────────────────
    if (authLoading || initLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    // ─── Step indicators ───────────────────────────────────────────────────
    const totalSteps = role === "provider" ? 3 : 1;
    const currentStep = step > totalSteps ? totalSteps : step;
    const visibleFields = providerType ? FIELD_MAP[providerType] : [];

    return (
        <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="Meddin" style={{ height: "40px" }} />
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    Step {currentStep} of {totalSteps}
                    <div className="flex gap-1">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 w-8 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-border"}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 pb-10">
                <div className="w-full max-w-lg">

                    {/* ─── STEP 1: Role Selection ─── */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome to Meddin!</h1>
                                <p className="text-muted-foreground text-base">How will you be using Meddin?</p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setRole("member")}
                                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${role === "member"
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-border hover:border-primary/40"
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl ${role === "member" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                        <UserRound className="h-6 w-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-foreground text-base">I'm seeking care</p>
                                        <p className="text-sm text-muted-foreground">Browse and book healthcare providers</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setRole("provider")}
                                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${role === "provider"
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-border hover:border-primary/40"
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl ${role === "provider" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                        <Stethoscope className="h-6 w-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-foreground text-base">I'm a Healthcare Professional</p>
                                        <p className="text-sm text-muted-foreground">Offer your services and manage consultations</p>
                                    </div>
                                </button>
                            </div>

                            <Button
                                onClick={handleRoleContinue}
                                className="w-full h-12 text-base"
                                disabled={!role || loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* ─── STEP 2: Provider Type Selection ─── */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">What type of professional are you?</h1>
                                <p className="text-muted-foreground">This helps patients find you more easily</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {PROVIDER_TYPES.map(({ value, label, icon: Icon, desc }) => (
                                    <button
                                        key={value}
                                        onClick={() => setProviderType(value)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${providerType === value
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border hover:border-primary/40"
                                            }`}
                                    >
                                        <div className={`p-2.5 rounded-xl ${providerType === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground text-sm">{label}</p>
                                            <p className="text-xs text-muted-foreground">{desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => setStep(1)} className="gap-1" disabled={loading}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </Button>
                                <Button
                                    onClick={handleTypeContinue}
                                    className="flex-1 h-12 text-base"
                                    disabled={!providerType || loading}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Continue
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 3: Provider Profile Form ─── */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h1 className="text-2xl font-bold text-foreground tracking-tight">Set up your profile</h1>
                                <p className="text-muted-foreground">Upload your CV to auto-fill, or enter details manually.</p>
                            </div>

                            {/* CV Upload Card */}
                            {!parsed && (
                                <Card className="border-dashed border-2 border-primary/30 bg-primary/[0.02]">
                                    <CardContent className="py-6">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Upload className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-foreground">Upload your CV / Resume</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    We'll use AI to extract your details automatically
                                                </p>
                                            </div>

                                            <input
                                                ref={fileRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                className="hidden"
                                                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                            />

                                            {cvFile ? (
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className="flex items-center gap-2 flex-1 bg-muted/50 rounded-lg p-3 text-sm">
                                                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                                        <span className="truncate text-foreground">{cvFile.name}</span>
                                                        <button onClick={() => setCvFile(null)} className="ml-auto">
                                                            <X className="h-4 w-4 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                    <Button onClick={handleCvUpload} disabled={parsing} size="sm">
                                                        {parsing ? (
                                                            <>
                                                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                                Parsing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="mr-1 h-3 w-3" />
                                                                Parse
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
                                                    <Upload className="h-4 w-4" />
                                                    Choose File
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {parsed && (
                                <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg p-3">
                                    <Check className="h-4 w-4" />
                                    <span className="font-medium">CV parsed — review and adjust below</span>
                                </div>
                            )}

                            {/* Dynamic form fields based on provider type */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {visibleFields.map(fieldKey => {
                                        const fieldDef = FIELD_LABELS[fieldKey];
                                        if (!fieldDef) return null;
                                        const isWide = fieldKey === "bio" || fieldKey === "services_offered";

                                        return (
                                            <div key={fieldKey} className={`space-y-1.5 ${isWide ? "sm:col-span-2" : ""}`}>
                                                <Label className="text-xs font-medium">{fieldDef.label}</Label>
                                                {fieldDef.rows ? (
                                                    <Textarea
                                                        placeholder={fieldDef.placeholder}
                                                        value={form[fieldKey] || ""}
                                                        onChange={e => updateField(fieldKey, e.target.value)}
                                                        rows={fieldDef.rows}
                                                        className="text-sm"
                                                    />
                                                ) : (
                                                    <Input
                                                        type={fieldDef.type || "text"}
                                                        placeholder={fieldDef.placeholder}
                                                        value={form[fieldKey] || ""}
                                                        onChange={e => updateField(fieldKey, e.target.value)}
                                                        className="text-sm"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => setStep(2)} className="gap-1" disabled={loading}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </Button>
                                <Button variant="ghost" onClick={handleSkip} className="gap-1 text-muted-foreground" disabled={loading}>
                                    <SkipForward className="h-4 w-4" />
                                    Skip for now
                                </Button>
                                <Button onClick={handleSaveProvider} className="ml-auto gap-1" disabled={loading}>
                                    {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                    Complete Setup
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
