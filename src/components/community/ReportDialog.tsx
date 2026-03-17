import { useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Flag, AlertTriangle, ShieldAlert, Megaphone, Skull, CircleHelp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { LucideIcon } from "lucide-react";

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: string;
    postId?: string | null;
}

const REASONS: { value: string; label: string; icon: LucideIcon; color: string }[] = [
    { value: "spam", label: "Spam", icon: Megaphone, color: "text-orange-500" },
    { value: "harassment", label: "Harassment", icon: AlertTriangle, color: "text-red-500" },
    { value: "misinformation", label: "Misinformation", icon: ShieldAlert, color: "text-amber-500" },
    { value: "hate_speech", label: "Hate Speech", icon: Skull, color: "text-red-600" },
    { value: "violence", label: "Violence", icon: Flag, color: "text-red-700" },
    { value: "other", label: "Other", icon: CircleHelp, color: "text-muted-foreground" },
];

const ReportDialog = ({ open, onOpenChange, communityId, postId }: ReportDialogProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [reason, setReason] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!user || !reason) return;
        setSubmitting(true);
        try {
            const { error } = await (supabase as any).from("community_reports").insert({
                reporter_id: user.id,
                community_id: communityId,
                post_id: postId || null,
                reason,
                description: description.trim(),
            } as any);

            if (error) throw error;
            toast({ title: "Report submitted", description: "Our team will review it shortly." });
            setReason(null);
            setDescription("");
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: "Failed to report", description: err.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Report {postId ? "Post" : "Community"}</DialogTitle>
                    <DialogDescription>Help us keep the community safe. Select a reason below.</DialogDescription>
                </DialogHeader>

                <div className="space-y-2 py-2">
                    {REASONS.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setReason(r.value)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${reason === r.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/40"
                                }`}
                        >
                            <r.icon className={`h-5 w-5 ${r.color}`} />
                            <span className="text-sm font-medium">{r.label}</span>
                        </button>
                    ))}
                </div>

                <div>
                    <Label className="text-sm font-semibold">Additional details (optional)</Label>
                    <Textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Tell us more..."
                        rows={3}
                        maxLength={500}
                        className="mt-1.5 resize-none"
                    />
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!reason || submitting} className="gap-2">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                        Submit Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReportDialog;
