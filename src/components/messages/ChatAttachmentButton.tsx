import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatAttachmentButtonProps {
  userId: string;
  conversationId: string;
  onAttachmentSent: () => void;
}

const ChatAttachmentButton = ({ userId, conversationId, onAttachmentSent }: ChatAttachmentButtonProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-attachments")
        .getPublicUrl(path);

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: "",
        attachment_url: urlData.publicUrl,
        attachment_type: file.type,
      });

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      onAttachmentSent();
    } catch (err: any) {
      toast.error("Failed to send file");
      console.error(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>
    </>
  );
};

export default ChatAttachmentButton;
