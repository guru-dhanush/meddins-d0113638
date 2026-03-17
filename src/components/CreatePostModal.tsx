import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreatePostModalProps {
    onClose: () => void;
    userProfile?: { full_name: string; avatar_url: string | null } | null;
    onPostCreated?: () => void;
    communityId?: string | null;
}

const CreatePostModal = ({ onClose, userProfile, onPostCreated, communityId }: CreatePostModalProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Focus textarea on open
        textareaRef.current?.focus();
        // Prevent body scrolling
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

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
            ...(communityId ? { community_id: communityId } : {}),
        });
        setSubmitting(false);
        if (error) {
            toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
        } else {
            toast({ title: "Post published!" });
            onPostCreated?.();
            onClose();
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-card w-full max-w-lg mx-4 mt-16 md:mt-24 rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!content.trim() || submitting}
                        className="rounded-full px-5 font-semibold"
                        size="sm"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                    </Button>
                </div>

                {/* Body */}
                <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
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
                                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 resize-none border-0 outline-none focus:ring-0 min-h-[100px] py-1"
                                maxLength={2000}
                            />

                            {/* Media preview */}
                            {mediaPreview && mediaFile && (
                                <div className="relative mb-3">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 z-10 rounded-full bg-black/70 hover:bg-black/90 border-0"
                                        onClick={removeMedia}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                    {mediaFile.type.startsWith("image/") ? (
                                        <img src={mediaPreview} alt="Preview" className="w-full max-h-64 rounded-xl object-cover" />
                                    ) : (
                                        <video src={mediaPreview} className="w-full max-h-64 rounded-xl" controls />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 px-4 py-2.5 border-t border-border">
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
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Media"
                    >
                        <img src="/icons/media.svg" alt="Media" className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Calendar"
                    >
                        <img src="/icons/calender.svg" alt="Calendar" className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Celebrate"
                    >
                        <img src="/icons/celebrate.svg" alt="Celebrate" className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Poll"
                    >
                        <img src="/icons/poll.svg" alt="Poll" className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        title="Document"
                    >
                        <img src="/icons/document.svg" alt="Document" className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatePostModal;
