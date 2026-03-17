import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ThumbsUp, MessageSquare, Share2, Send, Trash2, Stethoscope,
  MoreHorizontal, UserPlus, Globe, Flag, Bookmark, BookmarkCheck, Pin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostAuthor {
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author?: PostAuthor;
}

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    category: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    image_url?: string | null;
    community_id?: string | null;
    community_name?: string | null;
    is_pinned?: boolean;
  };
  author: PostAuthor;
  isLiked: boolean;
  onRefresh: () => void;
  /** If true, current user is a mod/creator in the community this post belongs to */
  isCommunityMod?: boolean;
  /** Callback to open the report dialog for this post */
  onReportPost?: (postId: string) => void;
  /** Mod-only: toggle pin state for this post */
  onPinToggle?: (postId: string, currentlyPinned: boolean) => void;
}

const extractHashtags = (text: string): string[] => {
  const matches = text.match(/#[\w]+/g);
  return matches ? [...new Set(matches.map((h) => h.toLowerCase()))] : [];
};

const renderContentWithHashtags = (text: string) => {
  const parts = text.split(/(#[\w]+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="text-primary font-semibold cursor-pointer hover:underline">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

const PostCard = ({ post, author, isLiked, onRefresh, isCommunityMod, onReportPost, onPinToggle }: PostCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<"none" | "pending" | "accepted" | "self">("self");
  const [connectLoading, setConnectLoading] = useState(false);

  const isOwner = user?.id === post.user_id;
  const canDelete = isOwner || isCommunityMod;
  const initials = author.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  // Check connection status
  useEffect(() => {
    if (!user || isOwner) { setConnectionStatus("self"); return; }
    const checkConnection = async () => {
      const { data } = await supabase
        .from("connections")
        .select("status")
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${post.user_id}),and(requester_id.eq.${post.user_id},receiver_id.eq.${user.id})`)
        .maybeSingle();
      setConnectionStatus(data ? (data.status as "pending" | "accepted") : "none");
    };
    checkConnection();
  }, [user, post.user_id, isOwner]);

  // Check bookmark status
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await (supabase as any)
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle();
      setBookmarked(!!data);
    };
    check();
  }, [user, post.id]);

  const handleConnect = async () => {
    if (!user || connectionStatus !== "none") return;
    setConnectLoading(true);
    const { error } = await supabase.from("connections").insert({
      requester_id: user.id,
      receiver_id: post.user_id,
    });
    if (error) {
      toast({ title: "Error", description: "Could not send connection request.", variant: "destructive" });
    } else {
      setConnectionStatus("pending");
      toast({ title: "Connection request sent!" });
    }
    setConnectLoading(false);
  };

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => c + (newLiked ? 1 : -1));
    if (newLiked) {
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      if (error) { setLiked(!newLiked); setLikesCount((c) => c - 1); }
    } else {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (error) { setLiked(!newLiked); setLikesCount((c) => c + 1); }
    }
  };

  const toggleBookmark = async () => {
    if (!user) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    if (newBookmarked) {
      const { error } = await (supabase as any).from("bookmarks").insert({ user_id: user.id, post_id: post.id });
      if (error) { setBookmarked(false); toast({ title: "Failed to bookmark", variant: "destructive" }); }
      else { toast({ title: "Saved! 🔖" }); }
    } else {
      const { error } = await (supabase as any).from("bookmarks").delete().eq("user_id", user.id).eq("post_id", post.id);
      if (error) { setBookmarked(true); }
      else { toast({ title: "Removed from saved" }); }
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase.from("post_comments").select("id, content, created_at, user_id").eq("post_id", post.id).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]));
      setComments(data.map((c) => ({
        ...c,
        author: {
          full_name: profileMap.get(c.user_id)?.full_name || "Unknown",
          avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
          role: roleMap.get(c.user_id) || null,
        },
      })));
    } else {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: user.id, content: commentText.trim() });
    if (error) { toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" }); }
    else { setCommentText(""); loadComments(); onRefresh(); }
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    loadComments();
    onRefresh();
  };

  const deletePost = async () => {
    if (!user || !canDelete) return;
    setDeleting(true);
    await supabase.from("post_likes").delete().eq("post_id", post.id);
    await supabase.from("post_comments").delete().eq("post_id", post.id);
    await (supabase as any).from("bookmarks").delete().eq("post_id", post.id);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    setDeleting(false);
    if (error) { toast({ title: "Error", description: "Failed to delete post.", variant: "destructive" }); }
    else { toast({ title: isOwner ? "Post deleted" : "Post removed by moderator" }); onRefresh(); }
  };

  const sharePost = () => {
    const url = post.community_name
      ? `${window.location.origin}/community/${post.community_name}`
      : `${window.location.origin}/feed`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!" });
  };

  const contentTooLong = post.content.length > 250;
  const displayContent = expanded || !contentTooLong ? post.content : post.content.slice(0, 250);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const shortTime = timeAgo
    .replace("about ", "")
    .replace(" hours", "h").replace(" hour", "h")
    .replace(" minutes", "m").replace(" minute", "m")
    .replace(" days", "d").replace(" day", "d")
    .replace(" months", "mo").replace(" month", "mo")
    .replace("less than a minute", "now")
    .replace("less than am", "now");

  return (
    <>
      <article className="bg-card border border-border rounded-none md:rounded-xl overflow-hidden">
        {/* ─── Pinned indicator (inside card, top strip) ─── */}
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 px-4 pt-2 pb-0">
            <Pin className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Pinned post</span>
          </div>
        )}
        {/* ─── Community Badge ─── */}
        {post.community_name && (
          <div className="px-4 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/community/${post.community_name}`); }}
              className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
            >
              h/{post.community_name}
            </button>
          </div>
        )}
        {/* ─── Author Header ─── */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-start gap-2.5">
            <Avatar
              className="h-12 w-12 flex-shrink-0 cursor-pointer ring-primary"
              onClick={() => navigate(`/user/${post.user_id}`)}
            >
              <AvatarImage src={author.avatar_url || undefined} />
              <AvatarFallback className="text-sm font-semibold border">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="font-semibold text-sm text-foreground cursor-pointer hover:underline hover:text-primary truncate"
                      onClick={() => navigate(`/user/${post.user_id}`)}
                    >
                      {author.full_name}
                    </span>
                    {author.role === "provider" && (
                      <Stethoscope className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {author.role === "provider" && (
                    <p className="text-xs text-muted-foreground truncate">Healthcare Professional</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <span>{shortTime}</span>
                    <span>·</span>
                    <Globe className="h-3 w-3" />
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {connectionStatus === "none" && (
                    <button
                      onClick={handleConnect}
                      disabled={connectLoading}
                      className="flex items-center gap-1 text-primary font-semibold text-sm hover:bg-primary/5 px-2.5 py-1 rounded-full transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Connect</span>
                    </button>
                  )}
                  {connectionStatus === "pending" && (
                    <span className="text-xs text-muted-foreground px-2.5 py-1">Pending</span>
                  )}

                  {/* More menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={sharePost}>Copy link</DropdownMenuItem>
                      <DropdownMenuItem onClick={toggleBookmark}>
                        {bookmarked ? <BookmarkCheck className="h-4 w-4 mr-2 text-primary" /> : <Bookmark className="h-4 w-4 mr-2" />}
                        {bookmarked ? "Remove Bookmark" : "Bookmark"}
                      </DropdownMenuItem>
                      {/* Pin / Unpin — mods only */}
                      {isCommunityMod && onPinToggle && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onPinToggle(post.id, !!post.is_pinned)}>
                            <Pin className={`h-4 w-4 mr-2 ${post.is_pinned ? "text-amber-500" : ""}`} />
                            {post.is_pinned ? "Unpin post" : "Pin post"}
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* Report Post */}
                      {!isOwner && onReportPost && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onReportPost(post.id)} className="text-destructive focus:text-destructive">
                            <Flag className="h-4 w-4 mr-2" /> Report post
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* Delete — owner or mod */}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isOwner ? "Delete post" : "Remove post (mod)"}
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{isOwner ? "Delete post?" : "Remove this post?"}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {isOwner
                                  ? "This action cannot be undone."
                                  : "This will remove the post from the community. The author will still see it in their profile."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={deletePost} disabled={deleting}>
                                {deleting ? "Deleting..." : isOwner ? "Delete" : "Remove"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Post Content ─── */}
        <div className="px-4 pb-2">
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {renderContentWithHashtags(displayContent)}
            {contentTooLong && !expanded && (
              <button onClick={() => setExpanded(true)} className="text-muted-foreground hover:text-primary ml-1">
                ...see more
              </button>
            )}
          </div>
        </div>

        {/* ─── Media ─── */}
        {post.image_url && (
          <div className="mt-1">
            {isVideoUrl(post.image_url) ? (
              <video src={post.image_url} className="w-full max-h-[512px] object-cover" controls />
            ) : (
              <img
                src={post.image_url}
                alt="Post media"
                className="w-full max-h-[512px] object-cover cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              />
            )}
          </div>
        )}

        {/* ─── Reaction Stats Bar ─── */}
        {(likesCount > 0 || post.comments_count > 0) && (
          <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {likesCount > 0 && (
                <>
                  <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-white">
                    <ThumbsUp className="h-2.5 w-2.5" />
                  </span>
                  <span>{likesCount}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {post.comments_count > 0 && (
                <button onClick={toggleComments} className="hover:underline hover:text-primary">
                  {post.comments_count} comment{post.comments_count !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Action Buttons ─── */}
        <div className="border-t border-border mx-4" />
        <div className="px-2 py-1 flex items-center justify-around">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${liked
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            <ThumbsUp className={`h-[18px] w-[18px] ${liked ? "fill-current" : ""}`} />
            <span>Like</span>
          </button>

          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            <span>Comment</span>
          </button>

          <button
            onClick={toggleBookmark}
            className={`flex items-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${bookmarked
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            {bookmarked ? <BookmarkCheck className="h-[18px] w-[18px]" /> : <Bookmark className="h-[18px] w-[18px]" />}
            <span>Save</span>
          </button>

          <button
            onClick={sharePost}
            className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Share2 className="h-[18px] w-[18px]" />
            <span>Share</span>
          </button>
        </div>

        {/* ─── Comments Section ─── */}
        {showComments && (
          <div className="border-t border-border px-4 py-3 space-y-3">
            <div className="flex gap-2 items-start">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{user?.user_metadata?.full_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  className="text-sm bg-secondary/50 border-border rounded-full h-9"
                  maxLength={500}
                />
                {commentText.trim() && (
                  <Button size="icon" onClick={submitComment} className="rounded-full h-9 w-9 flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {loadingComments ? (
              <p className="text-xs text-muted-foreground pl-10">Loading...</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start pl-0">
                  <Avatar className="h-8 w-8 flex-shrink-0 cursor-pointer" onClick={() => navigate(`/user/${c.user_id}`)}>
                    <AvatarImage src={c.author?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{c.author?.full_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-secondary/50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-semibold text-foreground cursor-pointer hover:underline"
                          onClick={() => navigate(`/user/${c.user_id}`)}
                        >
                          {c.author?.full_name}
                        </span>
                        {c.author?.role === "provider" && (
                          <Stethoscope className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 pl-3">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                      {(c.user_id === user?.id || isCommunityMod) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {comments.length === 0 && !loadingComments && (
              <p className="text-xs text-muted-foreground pl-10">No comments yet. Be the first!</p>
            )}
          </div>
        )}
      </article>

      {/* ─── Lightbox ─── */}
      {lightboxOpen && post.image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={post.image_url}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light"
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

export default PostCard;
