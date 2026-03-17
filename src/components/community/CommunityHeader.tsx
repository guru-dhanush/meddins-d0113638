import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users, Settings, Lock, Globe, Loader2, Shield, Share2, Flag, BellOff, Bell, Copy, Check,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CommunityHeaderProps {
    community: {
        id: string;
        name: string;
        display_name: string;
        description: string;
        icon_url: string | null;
        banner_url: string | null;
        category: string;
        visibility: string;
        creator_id: string;
        member_count: number;
        post_count: number;
        rules: { title: string; description: string }[];
    };
    membership: { isMember: boolean; role: string | null };
    isMuted?: boolean;
    onMembershipChange: () => void;
    onSettingsOpen?: () => void;
    onModerationOpen?: () => void;
    onReportOpen?: () => void;
    onMuteToggle?: () => void;
}

const CommunityHeader = ({
    community, membership, isMuted, onMembershipChange,
    onSettingsOpen, onModerationOpen, onReportOpen, onMuteToggle,
}: CommunityHeaderProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const isCreator = membership.role === "creator";
    const isMod = isCreator || membership.role === "moderator";

    const handleJoinLeave = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (membership.isMember) {
                if (isCreator) {
                    toast({ title: "Creators cannot leave", description: "Transfer ownership or delete the community instead.", variant: "destructive" });
                    setLoading(false);
                    return;
                }
                await (supabase as any).from("community_members").delete()
                    .eq("community_id", community.id).eq("user_id", user.id);
                toast({ title: "Left community" });
            } else {
                const isRestricted = community.visibility === "restricted";
                const status = isRestricted ? "pending" : "active";
                const { error } = await (supabase as any).from("community_members").insert({
                    community_id: community.id,
                    user_id: user.id,
                    role: "member",
                    status,
                } as any);
                if (error) throw error;
                toast({ title: isRestricted ? "Request sent!" : "Joined community!" });
            }
            onMembershipChange();
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [user, community, membership, isCreator, onMembershipChange, toast]);

    const handleShare = () => {
        const url = `${window.location.origin}/community/${community.name}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ title: "Link copied! 📋" });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-card rounded-none md:rounded-2xl border-2 border-border overflow-hidden">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/30 relative">
                {community.banner_url && (
                    <img src={community.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Badges on banner */}
                <div className="absolute top-3 right-3 flex gap-1.5">
                    {community.visibility !== "public" && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-background/80 backdrop-blur">
                            {community.visibility === "private" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                            {community.visibility}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-5 -mt-8 relative">
                {/* Avatar */}
                <Avatar className="h-16 w-16 ring-4 ring-card rounded-2xl mb-3">
                    <AvatarImage src={community.icon_url || undefined} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
                        {community.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-bold text-foreground tracking-tight truncate">{community.display_name}</h1>
                        <p className="text-sm text-muted-foreground">h/{community.name}</p>
                    </div>

                    {/* Actions cluster */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* More menu (includes Share, Settings, Moderation, etc.) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isCreator && onSettingsOpen && (
                                    <DropdownMenuItem onClick={onSettingsOpen}>
                                        <Settings className="h-4 w-4 mr-2" /> Community Settings
                                    </DropdownMenuItem>
                                )}
                                {isMod && onModerationOpen && (
                                    <DropdownMenuItem onClick={onModerationOpen}>
                                        <Shield className="h-4 w-4 mr-2" /> Moderation
                                    </DropdownMenuItem>
                                )}
                                {membership.isMember && onMuteToggle && (
                                    <DropdownMenuItem onClick={onMuteToggle}>
                                        {isMuted ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                                        {isMuted ? "Unmute Community" : "Mute Community"}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleShare}>
                                    {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Share2 className="h-4 w-4 mr-2" />}
                                    {copied ? "Link Copied!" : "Share Community"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleShare}>
                                    <Copy className="h-4 w-4 mr-2" /> Copy Invite Link
                                </DropdownMenuItem>
                                {!isCreator && onReportOpen && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={onReportOpen} className="text-destructive">
                                            <Flag className="h-4 w-4 mr-2" /> Report Community
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Join/Leave */}
                        <Button
                            onClick={handleJoinLeave}
                            disabled={loading}
                            variant={membership.isMember ? "outline" : "default"}
                            size="sm"
                            className={`rounded-full font-semibold ${membership.isMember ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40" : ""
                                }`}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                membership.isMember ? "Leave" : community.visibility === "restricted" ? "Request to Join" : "Join"
                            )}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 mt-3">
                    <span className="flex items-center gap-1.5 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <strong className="text-foreground">{community.member_count.toLocaleString()}</strong>
                        <span className="text-muted-foreground">members</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{community.post_count.toLocaleString()}</strong> posts
                    </span>
                </div>

                {community.description && (
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{community.description}</p>
                )}
            </div>
        </div>
    );
};

export default CommunityHeader;
