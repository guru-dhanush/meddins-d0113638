import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/PostCard";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bookmark, Star, Clock, DollarSign, Users, Loader2, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SavedTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState("posts");
  const [loading, setLoading] = useState(false);

  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedProviders, setSavedProviders] = useState<any[]>([]);
  const [savedCommunities, setSavedCommunities] = useState<any[]>([]);

  const fetchSavedPosts = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bookmarks } = await (supabase as any)
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!bookmarks?.length) { setSavedPosts([]); setLoading(false); return; }

    const postIds = bookmarks.map((b: any) => b.post_id);
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, category, user_id, community_id")
      .in("id", postIds);

    if (!posts?.length) { setSavedPosts([]); setLoading(false); return; }

    const userIds = [...new Set(posts.map(p => p.user_id))];
    const [{ data: profiles }, { data: roles }, { data: likes }, { data: comments }, { data: myLikes }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
    const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
    const likesCount = new Map<string, number>();
    likes?.forEach(l => likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1));
    const commentsCount = new Map<string, number>();
    comments?.forEach(c => commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1));
    setLikedPostIds(new Set(myLikes?.map(l => l.post_id) || []));

    setSavedPosts(posts.map(p => ({
      ...p,
      likes_count: likesCount.get(p.id) || 0,
      comments_count: commentsCount.get(p.id) || 0,
      _author: {
        full_name: profileMap.get(p.user_id)?.full_name || "Unknown",
        avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
        role: roleMap.get(p.user_id) || null,
      },
    })));
    setLoading(false);
  };

  const fetchSavedProviders = async () => {
    if (!user) return;
    setLoading(true);
    const { data: saved } = await (supabase as any)
      .from("saved_providers")
      .select("provider_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!saved?.length) { setSavedProviders([]); setLoading(false); return; }

    const providerIds = saved.map((s: any) => s.provider_id);
    const { data: providers } = await supabase
      .from("provider_profiles")
      .select("id, user_id, provider_type, specialization, bio, avg_rating, experience_years, consultation_fee, city")
      .in("id", providerIds);

    if (!providers?.length) { setSavedProviders([]); setLoading(false); return; }

    const userIds = providers.map(p => p.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

    setSavedProviders(providers.map(p => ({
      ...p,
      profile: profileMap.get(p.user_id) || { full_name: "Provider", avatar_url: null },
    })));
    setLoading(false);
  };

  const fetchSavedCommunities = async () => {
    if (!user) return;
    setLoading(true);
    const { data: saved } = await (supabase as any)
      .from("saved_communities")
      .select("community_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!saved?.length) { setSavedCommunities([]); setLoading(false); return; }

    const communityIds = saved.map((s: any) => s.community_id);
    const { data: communities } = await supabase
      .from("communities")
      .select("id, name, display_name, description, icon_url, category, member_count")
      .in("id", communityIds);

    setSavedCommunities(communities || []);
    setLoading(false);
  };

  useEffect(() => {
    if (subTab === "posts") fetchSavedPosts();
    else if (subTab === "doctors") fetchSavedProviders();
    else if (subTab === "communities") fetchSavedCommunities();
  }, [subTab, user]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="w-full justify-start bg-muted/50 rounded-full p-1 overflow-x-auto no-scrollbar scroll-smooth">
          <TabsTrigger value="posts" className="rounded-full text-xs px-4">Posts</TabsTrigger>
          <TabsTrigger value="doctors" className="rounded-full text-xs px-4">Doctors</TabsTrigger>
          <TabsTrigger value="communities" className="rounded-full text-xs px-4">Communities</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 mt-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : savedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No saved posts yet.</p>
          ) : savedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              author={post._author}
              isLiked={likedPostIds.has(post.id)}
              onRefresh={fetchSavedPosts}
            />
          ))}
        </TabsContent>

        <TabsContent value="doctors" className="space-y-3 mt-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : savedProviders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No saved doctors yet.</p>
          ) : savedProviders.map(provider => (
            <Card key={provider.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/user/${provider.user_id}`)}>
              <CardContent className="flex items-center gap-3 py-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={provider.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{provider.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{provider.specialization || provider.provider_type}</p>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    {provider.avg_rating > 0 && (
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-500 fill-amber-500" />{Number(provider.avg_rating).toFixed(1)}</span>
                    )}
                    {provider.experience_years > 0 && (
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{provider.experience_years}y</span>
                    )}
                    {provider.consultation_fee > 0 && (
                      <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />${provider.consultation_fee}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full text-xs">View</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="communities" className="space-y-3 mt-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : savedCommunities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No saved communities yet.</p>
          ) : savedCommunities.map(community => (
            <Card key={community.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/community/${community.name}`)}>
              <CardContent className="flex items-center gap-3 py-3">
                <Avatar className="h-12 w-12 rounded-xl">
                  <AvatarImage src={community.icon_url || undefined} className="object-cover" />
                  <AvatarFallback className="rounded-xl bg-primary text-primary-foreground font-bold">
                    {community.display_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{community.display_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{community.category?.replace("-", " ")}</Badge>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" />{community.member_count}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full text-xs">View</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SavedTab;
