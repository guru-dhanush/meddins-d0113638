import { useState, useRef, useCallback, useEffect } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Plus, X, ImagePlus, Save, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CommunitySettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    community: {
        id: string;
        name: string;
        display_name: string;
        description: string;
        icon_url: string | null;
        banner_url: string | null;
        visibility: string;
        rules: { title: string; description: string }[];
    };
    onUpdated: () => void;
}

interface FlairItem {
    id?: string;
    name: string;
    color: string;
    isNew?: boolean;
}

const VISIBILITY_OPTIONS = [
    { value: "public", label: "Public", desc: "Anyone can view and post" },
    { value: "restricted", label: "Restricted", desc: "Anyone can view, members post" },
    { value: "private", label: "Private", desc: "Only members can view and post" },
];

const FLAIR_COLORS = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

const CommunitySettings = ({ open, onOpenChange, community, onUpdated }: CommunitySettingsProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [displayName, setDisplayName] = useState(community.display_name);
    const [description, setDescription] = useState(community.description || "");
    const [visibility, setVisibility] = useState(community.visibility);
    const [rules, setRules] = useState<{ title: string; description: string }[]>(community.rules || []);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Flair state
    const [flairs, setFlairs] = useState<FlairItem[]>([]);
    const [flairsLoading, setFlairsLoading] = useState(false);
    const [deletedFlairIds, setDeletedFlairIds] = useState<string[]>([]);

    // Icon/Banner uploads
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(community.icon_url);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(community.banner_url);
    const iconRef = useRef<HTMLInputElement>(null);
    const bannerRef = useRef<HTMLInputElement>(null);

    // Fetch flairs
    const fetchFlairs = useCallback(async () => {
        setFlairsLoading(true);
        const { data } = await (supabase as any)
            .from("community_flairs")
            .select("id, name, color")
            .eq("community_id", community.id)
            .order("name");
        setFlairs(data?.map((f: any) => ({ id: f.id, name: f.name, color: f.color })) || []);
        setFlairsLoading(false);
    }, [community.id]);

    useEffect(() => {
        if (open) {
            fetchFlairs();
            setDeletedFlairIds([]);
        }
    }, [open, fetchFlairs]);

    const handleFileSelect = (type: "icon" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast({ title: "Only images allowed", variant: "destructive" }); return; }
        if (file.size > 5 * 1024 * 1024) { toast({ title: "Max 5MB", variant: "destructive" }); return; }
        const url = URL.createObjectURL(file);
        if (type === "icon") { setIconFile(file); setIconPreview(url); }
        else { setBannerFile(file); setBannerPreview(url); }
    };

    const addRule = () => {
        if (rules.length >= 10) { toast({ title: "Maximum 10 rules" }); return; }
        setRules([...rules, { title: "", description: "" }]);
    };

    const updateRule = (i: number, field: "title" | "description", value: string) => {
        const updated = [...rules];
        updated[i] = { ...updated[i], [field]: value };
        setRules(updated);
    };

    const removeRule = (i: number) => setRules(rules.filter((_, idx) => idx !== i));

    // Flair CRUD
    const addFlair = () => {
        if (flairs.length >= 20) { toast({ title: "Maximum 20 flairs" }); return; }
        setFlairs([...flairs, { name: "", color: FLAIR_COLORS[flairs.length % FLAIR_COLORS.length], isNew: true }]);
    };

    const updateFlair = (i: number, field: "name" | "color", value: string) => {
        const updated = [...flairs];
        updated[i] = { ...updated[i], [field]: value };
        setFlairs(updated);
    };

    const removeFlair = (i: number) => {
        const flair = flairs[i];
        if (flair.id) setDeletedFlairIds(prev => [...prev, flair.id!]);
        setFlairs(flairs.filter((_, idx) => idx !== i));
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const { error } = await supabase.storage.from("community-media").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("community-media").getPublicUrl(path);
        return data.publicUrl;
    };

    const handleSave = useCallback(async () => {
        if (!user) return;
        setSaving(true);
        try {
            let iconUrl = community.icon_url;
            let bannerUrl = community.banner_url;

            if (iconFile) {
                const ext = iconFile.name.split(".").pop();
                iconUrl = await uploadFile(iconFile, `${user.id}/${community.name}-icon.${ext}`);
            }
            if (bannerFile) {
                const ext = bannerFile.name.split(".").pop();
                bannerUrl = await uploadFile(bannerFile, `${user.id}/${community.name}-banner.${ext}`);
            }

            const cleanRules = rules.filter(r => r.title.trim());

            const { error } = await (supabase as any)
                .from("communities")
                .update({
                    display_name: displayName.trim(),
                    description: description.trim(),
                    visibility,
                    icon_url: iconUrl,
                    banner_url: bannerUrl,
                    rules: cleanRules as any,
                })
                .eq("id", community.id);

            if (error) throw error;

            // Handle flair changes
            // Delete removed flairs
            if (deletedFlairIds.length > 0) {
                await (supabase as any).from("community_flairs").delete().in("id", deletedFlairIds);
            }
            // Upsert flairs
            for (const flair of flairs) {
                if (!flair.name.trim()) continue;
                if (flair.id && !flair.isNew) {
                    // Update existing
                    await (supabase as any).from("community_flairs")
                        .update({ name: flair.name.trim(), color: flair.color })
                        .eq("id", flair.id);
                } else {
                    // Insert new
                    await (supabase as any).from("community_flairs").insert({
                        community_id: community.id,
                        name: flair.name.trim(),
                        color: flair.color,
                    });
                }
            }

            toast({ title: "Settings saved ✓" });
            onUpdated();
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: "Failed to save", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }, [user, community, displayName, description, visibility, rules, iconFile, bannerFile, flairs, deletedFlairIds, onUpdated, onOpenChange, toast]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { error } = await (supabase as any).from("communities").delete().eq("id", community.id);
            if (error) throw error;
            toast({ title: "Community deleted" });
            navigate("/communities");
        } catch (err: any) {
            toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4">
                    <SheetTitle className="text-xl font-bold">Community Settings</SheetTitle>
                    <SheetDescription>Manage h/{community.name}</SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Banner */}
                    <div>
                        <Label className="text-sm font-semibold mb-2 block">Banner Image</Label>
                        <button
                            onClick={() => bannerRef.current?.click()}
                            className="w-full h-28 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 overflow-hidden flex items-center justify-center transition-colors"
                        >
                            {bannerPreview ? (
                                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                            )}
                        </button>
                        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect("banner")} />
                    </div>

                    {/* Icon */}
                    <div>
                        <Label className="text-sm font-semibold mb-2 block">Community Icon</Label>
                        <button
                            onClick={() => iconRef.current?.click()}
                            className="h-20 w-20 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 overflow-hidden flex items-center justify-center transition-colors"
                        >
                            {iconPreview ? (
                                <img src={iconPreview} alt="Icon" className="h-full w-full object-cover" />
                            ) : (
                                <ImagePlus className="h-7 w-7 text-muted-foreground" />
                            )}
                        </button>
                        <input ref={iconRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect("icon")} />
                    </div>

                    {/* Name */}
                    <div>
                        <Label className="text-sm font-semibold">Display Name</Label>
                        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50} className="mt-1.5 h-11" />
                    </div>

                    {/* Description */}
                    <div>
                        <Label className="text-sm font-semibold">Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3} className="mt-1.5 resize-none" />
                        <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/500</p>
                    </div>

                    {/* Visibility */}
                    <div>
                        <Label className="text-sm font-semibold mb-2 block">Visibility</Label>
                        <div className="space-y-2">
                            {VISIBILITY_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setVisibility(opt.value)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${visibility === opt.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/40"
                                        }`}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{opt.label}</p>
                                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Post Flairs */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" /> Post Flairs
                            </Label>
                            <Button variant="ghost" size="sm" onClick={addFlair} className="h-7 gap-1 text-xs">
                                <Plus className="h-3 w-3" /> Add Flair
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {flairs.map((flair, i) => (
                                <div key={flair.id || `new-${i}`} className="flex gap-2 items-center bg-muted/30 rounded-xl p-2.5">
                                    {/* Color picker */}
                                    <div className="relative">
                                        <input
                                            type="color"
                                            value={flair.color}
                                            onChange={e => updateFlair(i, "color", e.target.value)}
                                            className="h-8 w-8 rounded-lg border-2 border-border cursor-pointer"
                                            title="Pick color"
                                        />
                                    </div>
                                    <Input
                                        placeholder="Flair name"
                                        value={flair.name}
                                        onChange={e => updateFlair(i, "name", e.target.value)}
                                        className="h-9 text-sm flex-1"
                                        maxLength={30}
                                    />
                                    <button onClick={() => removeFlair(i)} className="p-1 text-muted-foreground hover:text-destructive">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {flairs.length === 0 && !flairsLoading && (
                                <p className="text-xs text-muted-foreground">No flairs — users won't be able to tag posts</p>
                            )}
                        </div>
                    </div>

                    {/* Rules */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">Community Rules</Label>
                            <Button variant="ghost" size="sm" onClick={addRule} className="h-7 gap-1 text-xs">
                                <Plus className="h-3 w-3" /> Add Rule
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {rules.map((rule, i) => (
                                <div key={i} className="flex gap-2 items-start bg-muted/30 rounded-xl p-3">
                                    <span className="text-xs font-bold text-muted-foreground mt-2 w-5">{i + 1}.</span>
                                    <div className="flex-1 space-y-1.5">
                                        <Input
                                            placeholder="Rule title"
                                            value={rule.title}
                                            onChange={e => updateRule(i, "title", e.target.value)}
                                            className="h-9 text-sm"
                                        />
                                        <Input
                                            placeholder="Description (optional)"
                                            value={rule.description}
                                            onChange={e => updateRule(i, "description", e.target.value)}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                    <button onClick={() => removeRule(i)} className="p-1 mt-1 text-muted-foreground hover:text-destructive">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {rules.length === 0 && <p className="text-xs text-muted-foreground">No rules set</p>}
                        </div>
                    </div>

                    {/* Save */}
                    <Button onClick={handleSave} disabled={saving || !displayName.trim()} className="w-full h-11 gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>

                    {/* Danger Zone */}
                    <div className="border-2 border-destructive/20 rounded-2xl p-4 space-y-2">
                        <p className="text-sm font-bold text-destructive">Danger Zone</p>
                        <p className="text-xs text-muted-foreground">Deleting is permanent. All posts will lose their community link.</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-1">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Community
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete h/{community.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the community and remove all members. Posts will remain but lose their community link.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
                                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default CommunitySettings;
