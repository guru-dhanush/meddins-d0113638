import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Heart, Brain, Dumbbell, Apple, Stethoscope, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const trendingTopics = [
    { tag: "#mentalhealth", label: "Mental Health Awareness", icon: Brain },
    { tag: "#fitness", label: "Fitness & Workout Tips", icon: Dumbbell },
    { tag: "#nutrition", label: "Healthy Eating", icon: Apple },
    { tag: "#wellness", label: "Wellness Journey", icon: Heart },
    { tag: "#healthcare", label: "Healthcare Innovation", icon: Stethoscope },
];

interface MyCommunity {
    id: string;
    name: string;
    display_name: string;
    icon_url: string | null;
    member_count: number;
}

const FeedRightSidebar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myCommunities, setMyCommunities] = useState<MyCommunity[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchMyCommunities = async () => {
            const { data: memberships } = await (supabase as any)
                .from("community_members")
                .select("community_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .limit(5);

            if (!memberships || memberships.length === 0) return;

            const ids = memberships.map((m: any) => m.community_id);
            const { data } = await (supabase as any)
                .from("communities")
                .select("id, name, display_name, icon_url, member_count")
                .in("id", ids);

            setMyCommunities(data || []);
        };
        fetchMyCommunities();
    }, [user]);

    return (
        <div className="space-y-4">
            {/* My Communities */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            My Communities
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate("/communities")}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    {myCommunities.length === 0 ? (
                        <button
                            onClick={() => navigate("/communities")}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            Discover &amp; join communities →
                        </button>
                    ) : (
                        <div className="space-y-0.5">
                            {myCommunities.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => navigate(`/community/${c.name}`)}
                                    className="flex items-center gap-2.5 w-full px-2 py-2 text-left hover:bg-muted/50 rounded-md transition-colors group"
                                >
                                    <Avatar className="h-7 w-7 rounded-lg flex-shrink-0">
                                        <AvatarImage src={c.icon_url || undefined} />
                                        <AvatarFallback className="rounded-lg text-[10px] bg-primary/10 text-primary font-bold">
                                            {c.display_name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            h/{c.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {c.member_count} member{c.member_count !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </button>
                            ))}
                            {myCommunities.length > 0 && (
                                <button
                                    onClick={() => navigate("/communities")}
                                    className="text-xs text-primary font-medium px-2 py-1 hover:underline"
                                >
                                    See all →
                                </button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Trending topics */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Trending in Health
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="space-y-0.5">
                        {trendingTopics.map(({ tag, label, icon: Icon }) => (
                            <button
                                key={tag}
                                className="flex items-start gap-2.5 w-full px-2 py-2 text-left hover:bg-muted/50 rounded-md transition-colors group"
                            >
                                <Icon className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                                <div>
                                    <p className="text-xs font-medium text-foreground">{label}</p>
                                    <p className="text-[11px] text-muted-foreground">{tag}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Footer links */}
            <div className="px-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>About</span>
                    <span>Help</span>
                    <span>Privacy</span>
                    <span>Terms</span>
                </div>
                <Separator className="my-2" />
                <p className="text-[11px] text-muted-foreground">
                    Healther © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default FeedRightSidebar;
