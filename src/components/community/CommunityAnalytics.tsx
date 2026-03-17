import { useState, useEffect, useCallback } from "react";
import { BarChart3, Users, FileText, TrendingUp, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface CommunityAnalyticsProps {
    communityId: string;
}

interface TopContributor {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    post_count: number;
}

const CommunityAnalytics = ({ communityId }: CommunityAnalyticsProps) => {
    const [totalMembers, setTotalMembers] = useState(0);
    const [totalPosts, setTotalPosts] = useState(0);
    const [newMembersThisWeek, setNewMembersThisWeek] = useState(0);
    const [newPostsThisWeek, setNewPostsThisWeek] = useState(0);
    const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Total members
        const { count: membersCount } = await (supabase as any)
            .from("community_members")
            .select("id", { count: "exact", head: true })
            .eq("community_id", communityId)
            .eq("status", "active");

        setTotalMembers(membersCount || 0);

        // New members this week
        const { count: newMembers } = await (supabase as any)
            .from("community_members")
            .select("id", { count: "exact", head: true })
            .eq("community_id", communityId)
            .eq("status", "active")
            .gte("joined_at", oneWeekAgo);

        setNewMembersThisWeek(newMembers || 0);

        // Total posts
        const { count: postsCount } = await (supabase as any)
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("community_id", communityId);

        setTotalPosts(postsCount || 0);

        // New posts this week
        const { count: newPosts } = await (supabase as any)
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("community_id", communityId)
            .gte("created_at", oneWeekAgo);

        setNewPostsThisWeek(newPosts || 0);

        // Top contributors (by post count)
        const { data: communityPosts } = await (supabase as any)
            .from("posts")
            .select("user_id")
            .eq("community_id", communityId);

        if (communityPosts && communityPosts.length > 0) {
            const countMap = new Map<string, number>();
            communityPosts.forEach(p => countMap.set(p.user_id, (countMap.get(p.user_id) || 0) + 1));

            const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
            const userIds = sorted.map(([uid]) => uid);

            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name, avatar_url")
                .in("user_id", userIds);

            const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

            setTopContributors(sorted.map(([uid, count]) => ({
                user_id: uid,
                full_name: profileMap.get(uid)?.full_name || "Unknown",
                avatar_url: profileMap.get(uid)?.avatar_url || null,
                post_count: count,
            })));
        }

        setLoading(false);
    }, [communityId]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="p-5 space-y-3 animate-pulse">
                <div className="h-5 bg-muted rounded w-32" />
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border-2 border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Analytics
            </h3>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Members</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{totalMembers.toLocaleString()}</p>
                    {newMembersThisWeek > 0 && (
                        <p className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                            <TrendingUp className="h-3 w-3" /> +{newMembersThisWeek} this week
                        </p>
                    )}
                </div>

                <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Posts</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{totalPosts.toLocaleString()}</p>
                    {newPostsThisWeek > 0 && (
                        <p className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                            <TrendingUp className="h-3 w-3" /> +{newPostsThisWeek} this week
                        </p>
                    )}
                </div>
            </div>

            {/* Top Contributors */}
            {topContributors.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-500" /> Top Contributors
                    </h4>
                    <div className="space-y-2">
                        {topContributors.map((c, i) => (
                            <div key={c.user_id} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={c.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">{c.full_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium text-foreground flex-1 truncate">{c.full_name}</span>
                                <span className="text-[10px] text-muted-foreground">{c.post_count} posts</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommunityAnalytics;
