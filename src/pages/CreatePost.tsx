import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, Image, Video, X } from "lucide-react";

const CreatePost = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user, authLoading, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
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
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    } else {
      toast({ title: "Post created!" });
      navigate("/feed");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <AppLayout className="container mx-auto px-4 py-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Create Post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">

            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="What's on your mind? Use #hashtags to tag your post"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] resize-none"
                maxLength={2000}
              />

              {mediaPreview && mediaFile && (
                <div className="relative inline-block">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 z-10 rounded-full"
                    onClick={removeMedia}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {mediaFile.type.startsWith("image/") ? (
                    <img src={mediaPreview} alt="Preview" className="max-h-52 rounded-lg object-cover" />
                  ) : (
                    <video src={mediaPreview} className="max-h-52 rounded-lg" controls />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="ghost" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-4 w-4 mr-1" /> Photo
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Video className="h-4 w-4 mr-1" /> Video
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default CreatePost;
