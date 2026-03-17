import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, Video, X, Loader2, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Flair {
  id: string;
  name: string;
  color: string;
}

interface CreatePostFormProps {
  onPostCreated: () => void;
  userProfile?: { full_name: string; avatar_url: string | null } | null;
  communityId?: string;
}

const CreatePostForm = ({ onPostCreated, userProfile, communityId }: CreatePostFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available flairs for this community
  const fetchFlairs = useCallback(async () => {
    if (!communityId) return;
    const { data } = await (supabase as any)
      .from("community_flairs")
      .select("id, name, color")
      .eq("community_id", communityId)
      .order("name");
    setFlairs((data as Flair[]) || []);
  }, [communityId]);

  useEffect(() => {
    fetchFlairs();
  }, [fetchFlairs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Only images and videos are allowed", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File must be under 20MB", variant: "destructive" });
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadMedia = async (): Promise<string | null> => {
    if (!mediaFile || !user) return null;
    const ext = mediaFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, mediaFile);
    if (error) {
      toast({ title: "Failed to upload media", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    let imageUrl: string | null = null;
    if (mediaFile) {
      imageUrl = await uploadMedia();
      if (mediaFile && !imageUrl) { setSubmitting(false); return; }
    }
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      category: "general",
      image_url: imageUrl,
      ...(communityId ? { community_id: communityId } : {}),
      ...(selectedFlair ? { flair_id: selectedFlair } : {}),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    } else {
      setContent("");
      setSelectedFlair(null);
      removeMedia();
      onPostCreated();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  const initials = userProfile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  return (
    <div className="bg-card border-border px-4 py-3 border rounded-xl overflow-hidden mb-2">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={userProfile?.avatar_url || undefined} />
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            placeholder="What's happening?"
            value={content}
            onChange={handleContentChange}
            className="w-full bg-transparent text-[20px] text-foreground placeholder:text-muted-foreground/60 resize-none border-0 outline-none focus:ring-0 min-h-[52px] py-2"
            maxLength={2000}
          />

          {/* Flair picker */}
          {flairs.length > 0 && (
            <div className="flex items-center gap-1.5 pb-3 border-b border-border mb-3 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Flair:</span>
              {flairs.map(flair => (
                <button
                  key={flair.id}
                  type="button"
                  onClick={() => setSelectedFlair(selectedFlair === flair.id ? null : flair.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${selectedFlair === flair.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40 text-muted-foreground"
                    }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: flair.color }} />
                  {flair.name}
                </button>
              ))}
            </div>
          )}

          {/* Audience tag — only show when no flairs (keep the border separator) */}
          {flairs.length === 0 && (
            <div className="flex items-center gap-1 text-primary text-[13px] font-bold pb-3 border-b border-border mb-3" />
          )}

          {/* Media preview */}
          {mediaPreview && mediaFile && (
            <div className="relative mb-3">
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 z-10 rounded-full bg-black/70 hover:bg-black/90 border-0"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
              {mediaFile.type.startsWith("image/") ? (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-80 rounded-2xl object-cover" />
              ) : (
                <video src={mediaPreview} className="w-full max-h-80 rounded-2xl" controls />
              )}
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-0.5 -ml-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                title="Photo"
              >
                <Image className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                title="Video"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="p-2 rounded-full text-primary hover:bg-primary/10 transition-colors"
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="rounded-full px-5 font-bold"
              size="sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostForm;
