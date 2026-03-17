import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ShareRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  onChanged: () => void;
}

interface ProviderConnection {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  isShared: boolean;
}

const ShareRecordDialog = ({ open, onOpenChange, recordId, onChanged }: ShareRecordDialogProps) => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;

    const fetchData = async () => {
      setLoading(true);
      // Get user's accepted connections
      const { data: conns } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const connUserIds = (conns || []).map((c) =>
        c.requester_id === user.id ? c.receiver_id : c.requester_id
      );

      if (connUserIds.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // Get provider profiles among connections
      const { data: providerProfiles } = await supabase
        .from("provider_profiles")
        .select("user_id")
        .in("user_id", connUserIds);

      const providerUserIds = (providerProfiles || []).map((p) => p.user_id);

      if (providerUserIds.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", providerUserIds);

      // Get existing shares
      const { data: shares } = await supabase
        .from("health_record_shares")
        .select("shared_with")
        .eq("record_id", recordId);

      const sharedSet = new Set((shares || []).map((s) => s.shared_with));

      setProviders(
        (profiles || []).map((p) => ({
          userId: p.user_id,
          fullName: p.full_name || "Unknown",
          avatarUrl: p.avatar_url,
          isShared: sharedSet.has(p.user_id),
        }))
      );
      setLoading(false);
    };

    fetchData();
  }, [open, user, recordId]);

  const handleToggle = async (providerUserId: string, shared: boolean) => {
    if (!user) return;
    setToggling(providerUserId);
    try {
      if (shared) {
        const { error } = await supabase.from("health_record_shares").insert({
          record_id: recordId,
          shared_with: providerUserId,
          shared_by: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("health_record_shares")
          .delete()
          .eq("record_id", recordId)
          .eq("shared_with", providerUserId)
          .eq("shared_by", user.id);
        if (error) throw error;
      }
      setProviders((prev) =>
        prev.map((p) => (p.userId === providerUserId ? { ...p, isShared: shared } : p))
      );
      onChanged();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Record with Providers</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No connected providers found. Connect with a provider first.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {providers.map((p) => (
              <div key={p.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {p.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.fullName}</span>
                </div>
                <Switch
                  checked={p.isShared}
                  onCheckedChange={(checked) => handleToggle(p.userId, checked)}
                  disabled={toggling === p.userId}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecordDialog;
