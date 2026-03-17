import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import CommunityHeader from "@/components/community/CommunityHeader";
import CommunitySettings from "@/components/community/CommunitySettings";
import ModerationPanel from "@/components/community/ModerationPanel";
import ReportDialog from "@/components/community/ReportDialog";
import CommunityEvents from "@/components/community/CommunityEvents";
import CommunityAnalytics from "@/components/community/CommunityAnalytics";
import PostCard from "@/components/PostCard";
import CreatePostForm from "@/components/CreatePostForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ScrollText, Shield, MessageSquarePlus, Pin, ArrowUpDown, Clock, TrendingUp,
    MessageCircle, ChevronDown, Search, Loader2, XCircle, CalendarDays, BarChart3,
    Plus,
} from "lucide-react";
import CreatePostModal from "@/components/CreatePostModal";

interface Community {
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
}

interface Post {
    id: string;
    user_id: string;
    content: string;
    category: string;
    created_at: string;
    image_url: string | null;
    likes_count: number;
    comments_count: number;
    community_id: string | null;
    is_pinned: boolean;
    flair_id: string | null;
}

interface AuthorInfo {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
}

interface Flair {
    id: string;
    name: string;
    color: string;
}

type SortMode = "newest" | "top" | "discussed";

const CommunityPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [community, setCommunity] = useState<Community | null>(null);
    const [membership, setMembership] = useState<{ isMember: boolean; role: string | null; status: string | null }>({ isMember: false, role: null, status: null });
    const [posts, setPosts] = useState<Post[]>([]);
    const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
    const [authors, setAuthors] = useState<Map<string, AuthorInfo>>(new Map());
    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
    const [flairs, setFlairs] = useState<Flair[]>([]);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    // Sort, filter, search
    const [sortMode, setSortMode] = useState<SortMode>("newest");
    const [selectedFlair, setSelectedFlair] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [postsLimit, setPostsLimit] = useState(20);
    const [hasMore, setHasMore] = useState(true);

    // Panels
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [modOpen, setModOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportPostId, setReportPostId] = useState<string | null>(null);

    // Mobile sidebar sections
    const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
    const [mobileEventsOpen, setMobileEventsOpen] = useState(false);
    const [mobileRulesOpen, setMobileRulesOpen] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);

    const fetchCommunity = useCallback(async () => {
        if (!slug) return;
        const { data, error } = await (supabase as any)
            .from("communities")
            .select("*")
            .eq("name", slug)
            .maybeSingle();

        if (error || !data) { navigate("/communities"); return; }

        let rules: { title: string; description: string }[] = [];
        try { rules = typeof data.rules === "string" ? JSON.parse(data.rules) : (data.rules || []); } catch { /**/ }

        setCommunity({ ...data, rules });
        setLoading(false);
    }, [slug, navigate]);

    const fetchMembership = useCallback(async () => {
        if (!user || !community) return;
        // Check all statuses (active, pending, banned)
        const { data } = await (supabase as any)
            .from("community_members")
            .select("role, status")
            .eq("community_id", community.id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (!data) {
            setMembership({ isMember: false, role: null, status: null });
        } else if (data.status === "active") {
            setMembership({ isMember: true, role: data.role, status: "active" });
        } else {
            // pending or banned — not an active member
            setMembership({ isMember: false, role: null, status: data.status });
        }
    }, [user, community]);

    const fetchPosts = useCallback(async () => {
        if (!community) return;
        setPostsLoading(true);

        let query = (supabase as any)
            .from("posts")
            .select("*")
            .eq("community_id", community.id)
            .limit(postsLimit);

        if (selectedFlair) query = query.eq("flair_id", selectedFlair);
        if (searchQuery.trim()) query = query.ilike("content", `%${searchQuery.trim()}%`);

        if (sortMode === "newest") query = query.order("created_at", { ascending: false });
        else if (sortMode === "top") query = query.order("likes_count", { ascending: false });
        else if (sortMode === "discussed") query = query.order("comments_count", { ascending: false });

        const { data: postsData } = await query;

        if (!postsData || postsData.length === 0) {
            setPosts([]); setPinnedPosts([]);
            setPostsLoading(false);
            setHasMore(false);
            return;
        }

        setHasMore(postsData.length >= postsLimit);

        const pinned = postsData.filter(p => p.is_pinned);
        const regular = postsData.filter(p => !p.is_pinned);

        const allPosts = postsData;
        const postIds = allPosts.map(p => p.id);
        const [{ data: likesData }, { data: commentsData }] = await Promise.all([
            supabase.from("post_likes").select("post_id").in("post_id", postIds),
            supabase.from("post_comments").select("post_id").in("post_id", postIds),
        ]);

        const likesMap = new Map<string, number>();
        likesData?.forEach(l => likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1));
        const commentsMap = new Map<string, number>();
        commentsData?.forEach(c => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1));

        const enrich = (p: any): Post => ({
            ...p,
            likes_count: likesMap.get(p.id) || 0,
            comments_count: commentsMap.get(p.id) || 0,
        });

        setPinnedPosts(pinned.map(enrich));
        setPosts(regular.map(enrich));

        const userIds = [...new Set(allPosts.map((p: any) => p.user_id))] as string[];
        const [{ data: profiles }, { data: roles }] = await Promise.all([
            supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
            supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        ]);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
        const authorMap = new Map<string, AuthorInfo>();
        userIds.forEach((uid: string) => {
            authorMap.set(uid, {
                full_name: profileMap.get(uid)?.full_name || "Unknown",
                avatar_url: profileMap.get(uid)?.avatar_url || null,
                role: roleMap.get(uid) || null,
            });
        });
        setAuthors(authorMap);

        if (user) {
            const { data: likes } = await supabase
                .from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
            setLikedPostIds(new Set(likes?.map(l => l.post_id) || []));
        }

        setPostsLoading(false);
    }, [community, user, sortMode, selectedFlair, searchQuery, postsLimit]);

    const fetchFlairs = useCallback(async () => {
        if (!community) return;
        const { data } = await (supabase as any)
            .from("community_flairs")
            .select("*")
            .eq("community_id", community.id)
            .order("name");
        setFlairs((data as Flair[]) || []);
    }, [community]);

    const fetchMuteStatus = useCallback(async () => {
        if (!user || !community) return;
        const { data } = await (supabase as any)
            .from("muted_communities")
            .select("id")
            .eq("user_id", user.id)
            .eq("community_id", community.id)
            .maybeSingle();
        setIsMuted(!!data);
    }, [user, community]);

    const fetchUserProfile = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single();
        if (data) setUserProfile(data);
    }, [user]);

    const handleMuteToggle = async () => {
        if (!user || !community) return;
        if (isMuted) {
            await (supabase as any).from("muted_communities").delete().eq("user_id", user.id).eq("community_id", community.id);
            setIsMuted(false);
        } else {
            await (supabase as any).from("muted_communities").insert({ user_id: user.id, community_id: community.id });
            setIsMuted(true);
        }
    };

    const handlePinToggle = async (postId: string, currentlyPinned: boolean) => {
        const { error } = await (supabase as any).from("posts").update({ is_pinned: !currentlyPinned }).eq("id", postId);
        if (!error) fetchPosts();
    };

    const handleCancelPending = async () => {
        if (!user || !community) return;
        await (supabase as any).from("community_members").delete()
            .eq("community_id", community.id)
            .eq("user_id", user.id);
        fetchMembership();
    };

    const handleMembershipChange = useCallback(() => {
        fetchCommunity();
        fetchMembership();
    }, [fetchCommunity, fetchMembership]);

    const handleLoadMore = () => {
        setPostsLimit(prev => prev + 20);
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) { navigate("/auth"); return; }
        fetchCommunity();
        fetchUserProfile();
    }, [user, authLoading, navigate, fetchCommunity, fetchUserProfile]);

    useEffect(() => {
        if (community) {
            fetchMembership();
            fetchPosts();
            fetchFlairs();
            fetchMuteStatus();
        }
    }, [community, fetchMembership, fetchPosts, fetchFlairs, fetchMuteStatus]);

    const isMod = membership.role === "creator" || membership.role === "moderator";
    const isBanned = membership.status === "banned";
    const isPending = membership.status === "pending";

    if (authLoading || loading) {
        return (
            <AppLayout className="">
                <div className="container max-w-4xl px-4 py-6 space-y-6">
                    <Skeleton className="h-44 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            </AppLayout>
        );
    }

    if (!community) return null;

    // Private community access check
    if (community.visibility === "private" && !membership.isMember && !isBanned) {
        return (
            <AppLayout className="">
                <div className="container max-w-2xl px-4 py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Private Community</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        This community is private. You need an invitation to join.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/communities")}>
                        Browse Communities
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const SORT_OPTIONS: { value: SortMode; label: string; icon: React.ElementType }[] = [
        { value: "newest", label: "Newest", icon: Clock },
        { value: "top", label: "Top", icon: TrendingUp },
        { value: "discussed", label: "Most Discussed", icon: MessageCircle },
    ];

    const currentSort = SORT_OPTIONS.find(s => s.value === sortMode)!;

    const SidebarContent = () => (
        <>
            {/* About */}
            <div className="bg-card rounded-2xl border-2 border-border p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {community.description || "No description."}
                </p>
                <div className="flex items-center gap-6 mb-3">
                    <div>
                        <p className="font-bold text-foreground text-lg">{community.member_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                    <div>
                        <p className="font-bold text-foreground text-lg">{community.post_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                </div>
                <Badge variant="outline" className="text-xs border-2 rounded-lg px-2.5 py-1">
                    {community.category.replace("-", " ")}
                </Badge>
            </div>

            {/* Events */}
            <div className="bg-card rounded-2xl border-2 border-border p-5">
                <CommunityEvents communityId={community.id} isModerator={isMod} />
            </div>

            {/* Rules */}
            {community.rules && community.rules.length > 0 && (
                <div className="bg-card rounded-2xl border-2 border-border p-5">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                        <ScrollText className="h-4 w-4 text-primary" /> Rules
                    </h3>
                    <ol className="space-y-3">
                        {community.rules.map((rule, i) => (
                            <li key={i}>
                                <p className="text-sm font-medium text-foreground">{i + 1}. {rule.title}</p>
                                {rule.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-4">{rule.description}</p>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Analytics (creator only)
            {membership.role === "creator" && (
                <CommunityAnalytics communityId={community.id} />
            )} */}

            {/* Mod Tools */}
            {isMod && (
                <div className="bg-card rounded-2xl border-2 border-border p-5">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-primary" /> Moderator Tools
                    </h3>
                    <div className="space-y-2">
                        <Button size="sm" variant="outline" className="w-full justify-start text-xs gap-2 rounded-full"
                            onClick={() => setModOpen(true)}>
                            <Shield className="h-3.5 w-3.5" /> Manage Members & Reports
                        </Button>
                        {membership.role === "creator" && (
                            <Button size="sm" variant="outline" className="w-full justify-start text-xs gap-2 rounded-full"
                                onClick={() => setSettingsOpen(true)}>
                                <ScrollText className="h-3.5 w-3.5" /> Community Settings
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <AppLayout className="">
            <div className="container max-w-5xl px-0 md:px-4">
                <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
                    {/* ─── Main Feed ─── */}
                    <div className="space-y-4">
                        <CommunityHeader
                            community={community}
                            membership={membership}
                            isMuted={isMuted}
                            onMembershipChange={handleMembershipChange}
                            onSettingsOpen={() => setSettingsOpen(true)}
                            onModerationOpen={() => setModOpen(true)}
                            onReportOpen={() => { setReportPostId(null); setReportOpen(true); }}
                            onMuteToggle={handleMuteToggle}
                        />

                        {/* Banned notice */}
                        {isBanned && (
                            <div className="bg-destructive/5 border-2 border-destructive/20 rounded-2xl p-4 text-center">
                                <p className="text-sm font-semibold text-destructive">You are banned from this community</p>
                                <p className="text-xs text-muted-foreground mt-1">You can still view posts but cannot participate.</p>
                            </div>
                        )}

                        {/* Pending notice */}
                        {isPending && (
                            <div className="bg-amber-500/5 border-2 border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-amber-600">Join request pending</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">A moderator will review your request.</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={handleCancelPending} className="text-xs text-muted-foreground hover:text-destructive gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> Cancel
                                </Button>
                            </div>
                        )}

                        {/* Post Compose */}
                        {/* {membership.isMember && !isBanned && (
                            <div className="bg-card rounded-2xl border-2 border-border p-4">
                                <CreatePostForm onPostCreated={fetchPosts} userProfile={userProfile} communityId={community.id} />
                            </div>
                        )} */}

                        {/* Search & Sort & Flair filter bar */}
                        {/* <div className="space-y-2"> */}
                        {/* Search */}
                        {/* <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search posts..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-sm bg-card border-2 border-border rounded-xl"
                                />
                            </div> */}

                        {/* <div className="flex items-center gap-2 flex-wrap">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-2 rounded-xl">
                                            <ArrowUpDown className="h-3.5 w-3.5" />
                                            {currentSort.label}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {SORT_OPTIONS.map(opt => (
                                            <DropdownMenuItem key={opt.value} onClick={() => setSortMode(opt.value)}>
                                                <opt.icon className="h-4 w-4 mr-2" />
                                                {opt.label}
                                                {sortMode === opt.value && <span className="ml-auto text-primary">✓</span>}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {flairs.length > 0 && (
                                    <>
                                        <div className="h-5 border-l border-border" />
                                        {selectedFlair && (
                                            <button onClick={() => setSelectedFlair(null)} className="text-xs text-muted-foreground hover:text-foreground">
                                                Clear
                                            </button>
                                        )}
                                        {flairs.map(flair => (
                                            <button
                                                key={flair.id}
                                                onClick={() => setSelectedFlair(selectedFlair === flair.id ? null : flair.id)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${selectedFlair === flair.id
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-primary/40"
                                                    }`}
                                                style={{ borderColor: selectedFlair === flair.id ? flair.color : undefined }}
                                            >
                                                <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: flair.color }} />
                                                {flair.name}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div> */}
                        {/* </div> */}

                        {/* Create Post button for members */}
                        {membership.isMember && !isBanned && (
                            <Button
                                onClick={() => setShowPostModal(true)}
                                className="w-full rounded-full gap-2"
                            >
                                <Plus className="h-4 w-4" /> Create Post
                            </Button>
                        )}

                        {/* Mobile Events — shown between header and posts on small screens */}
                        <div className="lg:hidden">
                            <div className="bg-card rounded-2xl border-2 border-border p-4">
                                <CommunityEvents communityId={community.id} isModerator={isMod} />
                            </div>
                        </div>

                        {/* Pinned Posts */}
                        {pinnedPosts.length > 0 && (
                            <div className="space-y-3">
                                {pinnedPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        author={authors.get(post.user_id) || { full_name: "Unknown", avatar_url: null, role: null }}
                                        isLiked={likedPostIds.has(post.id)}
                                        onRefresh={fetchPosts}
                                        isCommunityMod={isMod}
                                        onReportPost={(pid) => { setReportPostId(pid); setReportOpen(true); }}
                                        onPinToggle={isMod ? handlePinToggle : undefined}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Posts */}
                        <div className="space-y-4">
                            {postsLoading ? (
                                [1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
                            ) : posts.length === 0 && pinnedPosts.length === 0 ? (
                                <div className="text-center py-16 bg-card rounded-2xl border-2 border-border">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <MessageSquarePlus className="h-7 w-7 text-primary" />
                                    </div>
                                    <p className="font-semibold text-foreground">
                                        {searchQuery ? "No posts found" : "No posts yet"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {searchQuery
                                            ? "Try a different search term"
                                            : membership.isMember ? "Be the first to share something!" : "Join to start posting"}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {posts.map(post => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            author={authors.get(post.user_id) || { full_name: "Unknown", avatar_url: null, role: null }}
                                            isLiked={likedPostIds.has(post.id)}
                                            onRefresh={fetchPosts}
                                            isCommunityMod={isMod}
                                            onReportPost={(pid) => { setReportPostId(pid); setReportOpen(true); }}
                                            onPinToggle={isMod ? handlePinToggle : undefined}
                                        />
                                    ))}
                                    {/* Load more */}
                                    {hasMore && !postsLoading && (
                                        <div className="flex justify-center py-2">
                                            <Button variant="outline" size="sm" onClick={handleLoadMore} className="gap-2 border-2 rounded-xl">
                                                Load more posts
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                    </div>

                    {/* ─── Desktop Sidebar ─── */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-20 space-y-4">
                            <SidebarContent />
                        </div>
                    </aside>
                </div>
            </div>

            {/* ─── Panels & Dialogs ─── */}
            {
                community && (
                    <>
                        <CommunitySettings
                            open={settingsOpen}
                            onOpenChange={setSettingsOpen}
                            community={community}
                            onUpdated={() => { fetchCommunity(); fetchFlairs(); }}
                        />
                        <ModerationPanel
                            open={modOpen}
                            onOpenChange={setModOpen}
                            communityId={community.id}
                            communityName={community.name}
                            currentUserRole={membership.role}
                        />
                        <ReportDialog
                            open={reportOpen}
                            onOpenChange={setReportOpen}
                            communityId={community.id}
                            postId={reportPostId}
                        />
                    </>
                )
            }
            {showPostModal && (
                <CreatePostModal
                    onClose={() => setShowPostModal(false)}
                    userProfile={userProfile}
                    communityId={community.id}
                    onPostCreated={fetchPosts}
                />
            )}
        </AppLayout >
    );
};

export default CommunityPage;
