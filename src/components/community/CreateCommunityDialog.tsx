import { useState, useRef } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Globe, Shield, Lock, Loader2, ArrowLeft, ArrowRight, ImagePlus,
    Heart, Brain, Dumbbell, Apple, Sparkles, Stethoscope, Baby, Pill, MessageSquare, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CreateCommunityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
    { value: "health", label: "Health", icon: Heart },
    { value: "mental-health", label: "Mental Health", icon: Brain },
    { value: "fitness", label: "Fitness", icon: Dumbbell },
    { value: "nutrition", label: "Nutrition", icon: Apple },
    { value: "wellness", label: "Wellness", icon: Sparkles },
    { value: "medical", label: "Medical", icon: Stethoscope },
    { value: "parenting", label: "Parenting", icon: Baby },
    { value: "chronic-illness", label: "Chronic Illness", icon: Pill },
    { value: "general", label: "General", icon: MessageSquare },
];

const VISIBILITY_OPTIONS = [
    {
        value: "public",
        label: "Public",
        description: "Anyone can view, post, and comment",
        icon: Globe,
    },
    {
        value: "restricted",
        label: "Restricted",
        description: "Anyone can view, but only approved members can post",
        icon: Shield,
    },
    {
        value: "private",
        label: "Private",
        description: "Only approved members can view and post",
        icon: Lock,
    },
];

const slugify = (text: string): string =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 30);

const CreateCommunityDialog = ({ open, onOpenChange }: CreateCommunityDialogProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [category, setCategory] = useState("health");
    const [visibility, setVisibility] = useState("public");
    const [displayName, setDisplayName] = useState("");
    const [description, setDescription] = useState("");
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [nameError, setNameError] = useState("");
    const iconInputRef = useRef<HTMLInputElement>(null);

    const slug = slugify(displayName);

    const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast({ title: "Only images are allowed", variant: "destructive" });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "Image must be under 2MB", variant: "destructive" });
            return;
        }
        setIconFile(file);
        setIconPreview(URL.createObjectURL(file));
    };

    const validateName = async (name: string) => {
        if (name.length < 3) { setNameError("Name must be at least 3 characters"); return false; }
        if (!/^[a-z0-9-]+$/.test(name)) { setNameError("Only lowercase letters, numbers, and hyphens"); return false; }

        const { data } = await (supabase as any).from("communities").select("id").eq("name", name).maybeSingle();
        if (data) { setNameError("This name is already taken"); return false; }

        setNameError("");
        return true;
    };

    const handleCreate = async () => {
        if (!user || !slug) return;
        const valid = await validateName(slug);
        if (!valid) return;

        setCreating(true);
        try {
            let iconUrl: string | null = null;
            if (iconFile) {
                const ext = iconFile.name.split(".").pop();
                const path = `${user.id}/${slug}-icon.${ext}`;
                const { error: uploadErr } = await supabase.storage.from("community-media").upload(path, iconFile, { upsert: true });
                if (uploadErr) throw uploadErr;
                const { data: urlData } = supabase.storage.from("community-media").getPublicUrl(path);
                iconUrl = urlData.publicUrl;
            }

            const { data: community, error } = await (supabase as any)
                .from("communities")
                .insert({
                    name: slug,
                    display_name: displayName.trim(),
                    description: description.trim(),
                    category,
                    visibility,
                    creator_id: user.id,
                    icon_url: iconUrl,
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-add creator as member with "creator" role
            const { error: memberErr } = await (supabase as any)
                .from("community_members")
                .insert({
                    community_id: community.id,
                    user_id: user.id,
                    role: "creator",
                    status: "active",
                });

            if (memberErr) throw memberErr;

            toast({ title: `h/${slug} created! 🎉` });
            onOpenChange(false);
            resetForm();
            navigate(`/community/${slug}`);
        } catch (err: any) {
            toast({ title: "Failed to create community", description: err.message, variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setCategory("health");
        setVisibility("public");
        setDisplayName("");
        setDescription("");
        setIconFile(null);
        if (iconPreview) URL.revokeObjectURL(iconPreview);
        setIconPreview(null);
        setNameError("");
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Step indicator bar — fixed top */}
                <div className="flex items-center gap-1.5 px-6 pt-5 pb-0 flex-shrink-0">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
                    ))}
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {/* ──── Step 1: Category ──── */}
                    {step === 1 && (
                        <>
                            <DialogHeader className="space-y-1 pt-3 pb-4 sticky top-0 bg-background z-10">
                                <DialogTitle className="text-xl font-bold tracking-tight">What's your community about?</DialogTitle>
                                <DialogDescription className="text-sm">Choose a topic to help people discover your community</DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.value}
                                            onClick={() => setCategory(cat.value)}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${category === cat.value
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-primary/40"
                                                }`}
                                        >
                                            <div className={`p-2 rounded-lg ${category === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                }`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-xs text-foreground">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ──── Step 2: Visibility ──── */}
                    {step === 2 && (
                        <>
                            <DialogHeader className="space-y-1 pt-3 pb-4">
                                <DialogTitle className="text-xl font-bold tracking-tight">What kind of community is this?</DialogTitle>
                                <DialogDescription className="text-sm">Decide who can view and contribute. This can be changed later.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-2.5 mb-5">
                                {VISIBILITY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setVisibility(opt.value)}
                                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${visibility === opt.value
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border hover:border-primary/40"
                                            }`}
                                    >
                                        <div className={`p-2.5 rounded-lg ${visibility === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                            }`}>
                                            <opt.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                                            <p className="text-xs text-muted-foreground">{opt.description}</p>
                                        </div>
                                        {visibility === opt.value && (
                                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ──── Step 3: Name & Details ──── */}
                    {step === 3 && (
                        <>
                            <DialogHeader className="space-y-1 pt-3 pb-4">
                                <DialogTitle className="text-xl font-bold tracking-tight">Tell us about your community</DialogTitle>
                                <DialogDescription className="text-sm">A name and description help people understand what your community is about</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5 mb-5">
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => iconInputRef.current?.click()}
                                        className="h-16 w-16 rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center flex-shrink-0 overflow-hidden transition-colors"
                                    >
                                        {iconPreview ? (
                                            <img src={iconPreview} alt="Icon" className="h-full w-full object-cover" />
                                        ) : (
                                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </button>
                                    <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconSelect} />

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <Label htmlFor="community-name" className="text-sm font-semibold">Community name *</Label>
                                            <Input
                                                id="community-name"
                                                placeholder="e.g. Mental Health Support"
                                                value={displayName}
                                                onChange={(e) => { setDisplayName(e.target.value); setNameError(""); }}
                                                maxLength={50}
                                                className="mt-1.5 h-10"
                                            />
                                            {slug && (
                                                <p className={`text-xs mt-1 ${nameError ? "text-destructive" : "text-muted-foreground"}`}>
                                                    {nameError || `h/${slug}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="community-desc" className="text-sm font-semibold">Description</Label>
                                    <Textarea
                                        id="community-desc"
                                        placeholder="What's this community about?"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        maxLength={500}
                                        rows={3}
                                        className="mt-1.5 resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/500</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer — fixed bottom */}
                <div className="px-6 py-4 border-t border-border flex-shrink-0 flex justify-end gap-2">
                    {step === 1 && (
                        <>
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button onClick={() => setStep(2)} className="gap-1">
                                Continue <ArrowRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                            <Button onClick={() => setStep(3)} className="gap-1">
                                Continue <ArrowRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                            <Button onClick={handleCreate} disabled={!displayName.trim() || creating} className="gap-1">
                                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Create Community
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateCommunityDialog;
