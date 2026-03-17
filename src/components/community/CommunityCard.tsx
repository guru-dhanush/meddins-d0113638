import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock, Shield, Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CommunityCardProps {
    community: {
        id: string;
        name: string;
        display_name: string;
        description: string | null;
        icon_url: string | null;
        banner_url?: string | null;
        category: string;
        visibility: string;
        member_count: number;
        post_count: number;
    };
    isJoined?: boolean;
    onJoinToggle?: () => void;
}

const formatCount = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
            : n.toString();

const CommunityCard = ({ community, isJoined = false, onJoinToggle }: CommunityCardProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [joined, setJoined] = useState(isJoined);
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!user) return;
        (supabase as any).from("saved_communities").select("id").eq("user_id", user.id).eq("community_id", community.id).maybeSingle().then(({ data }: any) => setSaved(!!data));
    }, [user, community.id]);

    const toggleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) { navigate("/auth"); return; }
        if (saved) {
            await (supabase as any).from("saved_communities").delete().eq("user_id", user.id).eq("community_id", community.id);
            setSaved(false);
            toast({ title: "Removed from saved" });
        } else {
            await (supabase as any).from("saved_communities").insert({ user_id: user.id, community_id: community.id });
            setSaved(true);
            toast({ title: "Saved! 🔖" });
        }
    };

    const handleJoin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) { navigate("/auth"); return; }
        if (joined) { navigate(`/community/${community.name}`); return; }
        setLoading(true);
        try {
            await (supabase as any).from("community_members").insert({
                community_id: community.id,
                user_id: user.id,
                role: "member",
                status: community.visibility === "private" ? "pending" : "active",
            });
            setJoined(true);
            toast({ title: community.visibility === "private" ? "Request sent" : `Joined h/${community.name} ✓` });
            onJoinToggle?.();
        } catch {
            toast({ title: "Already a member or request pending" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div onClick={() => navigate(`/community/${community.name}`)} className="cursor-pointer">
            <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 border-border/60 overflow-hidden">
                {/* Cover / avatar area — mirrors ProviderCard exactly */}
                <div className="relative">
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 h-20 overflow-hidden">
                        {community.banner_url && (
                            <img src={community.banner_url} alt="" className="w-full h-full object-cover" />
                        )}
                    </div>
                    {/* Visibility badge */}
                    {community.visibility !== "public" && (
                        <div className="absolute top-1.5 right-1.5">
                            <Badge className="bg-primary/90 text-white border-0 text-[9px] px-1.5 py-0 gap-0.5">
                                {community.visibility === "private"
                                    ? <><Lock className="h-2.5 w-2.5" /> Private</>
                                    : <><Shield className="h-2.5 w-2.5" /> Restricted</>}
                            </Badge>
                        </div>
                    )}
                    {user && (
                        <button onClick={toggleSave} className="absolute top-1.5 left-1.5 p-1 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors">
                            {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                    )}
                    {/* Community icon centred at bottom, half-overlapping */}
                    <Avatar className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10 w-12 h-12 rounded-xl border-2 border-background shadow-sm">
                        <AvatarImage src={community.icon_url || undefined} className="object-cover" />
                        <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-lg font-bold">
                            {community.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <CardContent className="pt-7 pb-4 px-3 text-center">
                    {/* Name */}
                    <h3 className="font-semibold text-foreground text-sm truncate">{community.display_name}</h3>

                    {/* Handle + category badge */}
                    <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {community.category.replace("-", " ")}
                        </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 leading-tight">
                        {community.description || `Join discussions about ${community.category.replace("-", " ")}.`}
                    </p>

                    {/* Members count */}
                    <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{formatCount(community.member_count)} member{community.member_count !== 1 ? "s" : ""}</span>
                    </div>

                    {/* CTA */}
                    <Button
                        variant="outline"
                        size="sm"
                        className={`w-full mt-3 h-7 text-xs ${joined
                                ? "text-muted-foreground border-border"
                                : "text-primary border-primary/30 hover:bg-primary/5"
                            }`}
                        onClick={handleJoin}
                        disabled={loading}
                    >
                        {joined ? "Joined ✓" : "Join Community"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default CommunityCard;
