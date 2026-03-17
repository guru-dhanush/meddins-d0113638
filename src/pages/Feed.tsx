import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import CreatePostForm from "@/components/CreatePostForm";
import FeedProfileCard from "@/components/FeedProfileCard";
import FeedRightSidebar from "@/components/FeedRightSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { FeedSkeleton } from "@/components/skeletons/PageSkeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  community_name: string | null;
}

interface AuthorInfo {
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
}

type Booking = {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  provider_name?: string;
  provider_avatar?: string | null;
  service_name?: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const Feed = () => {
  const { user, loading: authLoading } = useAuth();
  const { mode } = useAppMode();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Map<string, AuthorInfo>>(new Map());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();
    if (data) setUserProfile(data);
  }, [user]);

  const fetchUpcomingBookings = useCallback(async () => {
    if (!user) return;
    setBookingsLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: patientData } = await supabase
      .from("bookings")
      .select("*")
      .eq("patient_id", user.id)
      .gte("booking_date", today)
      .in("status", ["pending", "accepted"])
      .order("booking_date", { ascending: true })
      .limit(5);

    if (patientData?.length) {
      const providerIds = [...new Set(patientData.map(b => b.provider_id))];
      const { data: pps } = await supabase.from("provider_profiles").select("id, user_id").in("id", providerIds);
      const ppMap = new Map(pps?.map(p => [p.id, p.user_id]) || []);
      const ppUserIds = pps?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ppUserIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const serviceIds = [...new Set(patientData.filter(b => (b as any).service_id).map(b => (b as any).service_id))];
      let serviceMap = new Map<string, string>();
      if (serviceIds.length) {
        const { data: servicesData } = await supabase.from("services").select("id, name").in("id", serviceIds);
        serviceMap = new Map(servicesData?.map(s => [s.id, s.name]) || []);
      }

      setUpcomingBookings(patientData.map(b => {
        const provUserId = ppMap.get(b.provider_id) || "";
        return {
          ...b,
          provider_name: profileMap.get(provUserId)?.full_name || "Provider",
          provider_avatar: profileMap.get(provUserId)?.avatar_url || null,
          service_name: (b as any).service_id ? serviceMap.get((b as any).service_id) : undefined,
        };
      }));
    } else {
      setUpcomingBookings([]);
    }
    setBookingsLoading(false);
  }, [user]);

  const fetchPosts = useCallback(async () => {
    let mutedIds: string[] = [];
    if (user) {
      const { data: muted } = await (supabase as any)
        .from("muted_communities")
        .select("community_id")
        .eq("user_id", user.id);
      mutedIds = muted?.map((m: any) => m.community_id) || [];
    }

    const { data: postsData } = await (supabase as any)
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    let filteredPostsData = mutedIds.length > 0
      ? postsData.filter((p: any) => !p.community_id || !mutedIds.includes(p.community_id))
      : postsData;

    // In community mode, only show community posts
    if (mode === "community") {
      filteredPostsData = filteredPostsData.filter((p: any) => p.community_id);
    }

    const postIds = filteredPostsData.map((p: any) => p.id);
    const [{ data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);

    const likesCountMap = new Map<string, number>();
    likesData?.forEach(l => likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1));
    const commentsCountMap = new Map<string, number>();
    commentsData?.forEach(c => commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1));

    const enrichedPosts: Post[] = filteredPostsData.map((p: any) => ({
      ...p,
      likes_count: likesCountMap.get(p.id) || 0,
      comments_count: commentsCountMap.get(p.id) || 0,
      community_id: p.community_id || null,
      community_name: null,
    }));

    const communityIds = [...new Set(filteredPostsData.filter((p: any) => p.community_id).map((p: any) => p.community_id))];
    if (communityIds.length > 0) {
      const { data: comms } = await (supabase as any)
        .from("communities")
        .select("id, name")
        .in("id", communityIds);
      const commMap = new Map(comms?.map((c: any) => [c.id, c.name]));
      enrichedPosts.forEach(p => {
        if (p.community_id) p.community_name = (commMap.get(p.community_id) as string) || null;
      });
    }

    setPosts(enrichedPosts);

    const userIds = [...new Set(filteredPostsData.map((p: any) => p.user_id))] as string[];
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
    ]);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
    const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]));

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
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id);
      setLikedPostIds(new Set(likes?.map((l) => l.post_id) || []));
    }

    setLoading(false);
  }, [user, mode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    fetchUserProfile();
    fetchPosts();
    if (mode === "care") fetchUpcomingBookings();
  }, [user, authLoading, navigate, fetchPosts, fetchUserProfile, mode, fetchUpcomingBookings]);

  if (authLoading || loading) {
    return (
      <AppLayout className="">
        <FeedSkeleton />
      </AppLayout>
    );
  }

  // ─── Care Mode Home ───
  const CareHome = () => (
    <div className="space-y-4">
      {/* Upcoming Appointments */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-lg font-bold text-foreground">Upcoming Appointments</h2>
          <button onClick={() => navigate("/dashboard")} className="text-xs text-primary font-medium flex items-center gap-0.5">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        {bookingsLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
              <button onClick={() => navigate("/providers")} className="text-xs text-primary font-medium mt-2">
                Browse providers
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map(booking => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/dashboard")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={booking.provider_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {booking.provider_name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{booking.provider_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        <Clock className="h-3 w-3 ml-1" />
                        {booking.booking_time}
                      </div>
                      {booking.service_name && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{booking.service_name}</p>
                      )}
                    </div>
                    <Badge className={statusColors[booking.status] || "text-xs"}>{booking.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/providers")}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <img src="/icons/provider.svg" alt="Browse" className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">Find Provider</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/health-records")}>
          <CardContent className="p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <img src="/icons/document.svg" alt="Records" className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">Health Records</span>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Stats */}
      <Card className="cursor-pointer" onClick={() => navigate("/dashboard")}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">View Full Dashboard</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppLayout className="">
      <div className="container max-w-6xl px-0 md:px-4 py-2 md:py-4">
        <div className="lg:grid lg:grid-cols-[280px_1fr_300px] lg:gap-0">

          {/* Left sidebar — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 pr-4">
              <FeedProfileCard profile={userProfile} />
            </div>
          </aside>

          {/* Center feed */}
          <div className="min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "care" ? (
                  <div className="px-4 md:px-0">
                    <CareHome />
                  </div>
                ) : (
                  <>
                    {/* Inline Compose Box — hidden on mobile */}
                    <div className="hidden md:block">
                      <CreatePostForm onPostCreated={fetchPosts} userProfile={userProfile} />
                    </div>

                    {/* Posts */}
                    {posts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-16 text-[15px]">
                        {mode === "community" ? "No community posts yet." : "No posts yet. Be the first to share!"}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {posts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            author={authors.get(post.user_id) || { full_name: "Unknown", avatar_url: null, role: null }}
                            isLiked={likedPostIds.has(post.id)}
                            onRefresh={fetchPosts}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right sidebar — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 pl-4">
              <FeedRightSidebar />
            </div>
          </aside>

        </div>
      </div>
    </AppLayout>
  );
};

export default Feed;
