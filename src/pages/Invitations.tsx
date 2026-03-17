import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, UserPlus, UserRound, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Invitation = {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
  };
  providerType?: string | null;
};

const Invitations = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("connections")
      .select("id, requester_id, status, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const userIds = data.map((c) => c.requester_id);

      const [{ data: profiles }, { data: providerProfiles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, banner_url, bio")
          .in("user_id", userIds),
        (supabase as any)
          .from("provider_profiles")
          .select("user_id, provider_type")
          .in("user_id", userIds),
      ]);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]));
      const providerMap = new Map<string, string>(providerProfiles?.map((p: any) => [p.user_id, p.provider_type as string]));

      setInvitations(
        data.map((c) => ({
          ...c,
          profile: profileMap.get(c.requester_id) || {
            full_name: "Unknown",
            avatar_url: null,
            banner_url: null,
            bio: null,
          },
          providerType: providerMap.get(c.requester_id) || null,
        }))
      );
    } else {
      setInvitations([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (user) fetchInvitations();
  }, [user, authLoading]);

  const handleAction = async (id: string, status: "accepted" | "rejected") => {
    setActionLoading(id);
    const { error } = await supabase
      .from("connections")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Connection accepted!" : "Connection declined." });
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    }
    setActionLoading(null);
  };

  return (
    <AppLayout className="p-0">
      <div className="container max-w-6xl mx-auto p-2 md:p-4">
        <div className="bg-background p-4 rounded-none md:rounded-md">
          <h1 className="text-lg font-bold text-foreground mb-4">Connection Requests</h1>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-20">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No pending requests</h3>
              <p className="text-muted-foreground text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {invitations.map((inv) => {
                const isActioning = actionLoading === inv.id;
                return (
                  <Card
                    key={inv.id}
                    className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-border/60 overflow-hidden"
                    onClick={() => navigate(`/user/${inv.requester_id}`)}
                  >
                    {/* Banner */}
                    <div className="relative">
                      <div className="bg-gradient-to-br from-primary/20 to-primary/5 h-24 overflow-hidden">
                        {inv.profile?.banner_url && (
                          <img src={inv.profile.banner_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      {/* Avatar */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 w-14 h-14 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center overflow-hidden shadow-sm">
                        {inv.profile?.avatar_url ? (
                          <img src={inv.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserRound className="h-6 w-6 text-primary" />
                        )}
                      </div>
                    </div>

                    <CardContent className="pt-8 pb-4 px-3 text-center">
                      {/* Name */}
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {inv.profile?.full_name || "Unknown"}
                      </h3>

                      {/* Provider type badge */}
                      {inv.providerType && (
                        <div className="flex items-center justify-center mt-1">
                          <Badge variant="outline" className="text-[10px] gap-0.5 capitalize px-1.5 py-0">
                            <UserRound className="h-3 w-3" /> {inv.providerType}
                          </Badge>
                        </div>
                      )}

                      {/* Bio */}
                      {inv.profile?.bio && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 leading-tight">
                          {inv.profile.bio}
                        </p>
                      )}

                      {/* Time ago */}
                      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          disabled={isActioning}
                          onClick={() => handleAction(inv.id, "accepted")}
                        >
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-0.5" />}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          disabled={isActioning}
                          onClick={() => handleAction(inv.id, "rejected")}
                        >
                          <X className="h-3 w-3 mr-0.5" /> Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Invitations;
