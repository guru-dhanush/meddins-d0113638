import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import CommunityCard from "@/components/community/CommunityCard";
import CreateCommunityDialog from "@/components/community/CreateCommunityDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Loader2, Users, Plus, Sparkles, TrendingUp, Star, Clock, BarChart3, Heart, Brain, Dumbbell, Apple, Stethoscope, Baby, Pill, MessageSquare } from "lucide-react";
import { CommunitySkeleton } from "@/components/skeletons/PageSkeletons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { CommunitySkeleton } from "@/components/skeletons/PageSkeletons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Community {
    id: string;
    name: string;
    display_name: string;
    description: string | null;
    icon_url: string | null;
    banner_url: string | null;
    category: string;
    visibility: string;
    member_count: number;
    post_count: number;
}

const CATEGORY_FILTERS = [
    { value: "all", label: "All", icon: Star },
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

const SORT_OPTIONS = [
    { value: "popular", label: "Most Popular", icon: Users },
    { value: "newest", label: "Newest", icon: Clock },
    { value: "active", label: "Most Active", icon: BarChart3 },
];

type SortBy = "popular" | "newest" | "active";

const FilterPill = ({
    active,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: React.ElementType;
    label: string;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
    >
        <Icon className="h-3 w-3" />
        <span>{label}</span>
    </button>
);

const Communities = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [communities, setCommunities] = useState<Community[]>([]);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [category, setCategory] = useState("all");
    const [sortBy, setSortBy] = useState<SortBy>("popular");

    const fetchCommunities = useCallback(async () => {
        setLoading(true);

        let query = (supabase as any)
            .from("communities")
            .select("*")
            .in("visibility", ["public", "restricted"])
            .limit(60);

        if (category !== "all") query = query.eq("category", category);
        if (sortBy === "popular") query = query.order("member_count", { ascending: false });
        else if (sortBy === "newest") query = query.order("created_at", { ascending: false });
        else if (sortBy === "active") query = query.order("post_count", { ascending: false });

        const { data } = await query;
        setCommunities((data as Community[]) || []);

        // Fetch joined IDs for current user
        if (user) {
            const { data: memberships } = await (supabase as any)
                .from("community_members")
                .select("community_id")
                .eq("user_id", user.id)
                .eq("status", "active");
            setJoinedIds(new Set(memberships?.map(m => m.community_id) ?? []));
        }

        setLoading(false);
    }, [user, category, sortBy]);

    useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

    return (
        <AppLayout className="p-0">
            <div className="container max-w-6xl mx-auto p-2 md:p-4">
                {/* Top action bar */}
                <div className="flex items-center justify-between mb-2 p-4 bg-background rounded-none md:rounded-md">
                    <div>
                        <h1 className="text-sm font-semibold text-foreground">{t("communities.title")}</h1>
                        <p className="text-xs text-muted-foreground">{t("communities.subtitle")}</p>
                    </div>
                    <Button
                        onClick={() => setDialogOpen(true)}
                        size="sm"
                        className="gap-1.5 h-8 px-3 text-xs font-semibold"
                    >
                        <Plus className="h-3.5 w-3.5" /> {t("communities.createCommunity")}
                    </Button>
                </div>

                {/* Filters panel — same pattern as BrowseFilters */}
                <div className="bg-background p-4 rounded-none md:rounded-md">
                    <ScrollArea className="w-full mb-4">
                        <div className="flex items-center gap-1.5 pb-2">
                            {/* Category filters */}
                            {CATEGORY_FILTERS.map(f => (
                                <FilterPill
                                    key={f.value}
                                    active={category === f.value}
                                    icon={f.icon}
                                    label={f.label}
                                    onClick={() => setCategory(f.value)}
                                />
                            ))}

                            {/* Divider */}
                            <div className="w-px h-5 bg-border flex-shrink-0" />

                            {/* Sort options */}
                            {SORT_OPTIONS.map(s => (
                                <FilterPill
                                    key={s.value}
                                    active={sortBy === s.value}
                                    icon={s.icon}
                                    label={s.label}
                                    onClick={() => setSortBy(s.value as SortBy)}
                                />
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    {/* Grid — same as BrowseProviders: 2 → 3 → 4 cols */}
                    {loading ? (
                        <CommunitySkeleton />
                    ) : communities.length === 0 ? (
                        <div className="text-center py-20">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">{t("communities.noCommunities")}</h3>
                            <p className="text-muted-foreground text-sm mb-4">{t("communities.tryDifferent")}</p>
                            <Button onClick={() => setDialogOpen(true)} variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" /> {t("communities.createCommunity")}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {communities.map(c => (
                                <CommunityCard
                                    key={c.id}
                                    community={c}
                                    isJoined={joinedIds.has(c.id)}
                                    onJoinToggle={fetchCommunities}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CreateCommunityDialog
                open={dialogOpen}
                onOpenChange={open => { setDialogOpen(open); if (!open) fetchCommunities(); }}
            />
        </AppLayout>
    );
};

export default Communities;
