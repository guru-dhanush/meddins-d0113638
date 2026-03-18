/**
 * Chats.tsx — Unified Chat Page
 *
 * Features:
 *   - Last message preview in conversation list
 *   - Unread count badge per conversation
 *   - New messages push conversations to top
 *   - Infinite scroll pagination for messages
 *   - Realtime updates
 */

import {
    useEffect, useState, useRef, useCallback,
    type RefObject
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2, ArrowLeft, Smile, MessageCircle, X,
    Search, PenSquare, MoreHorizontal,
    ImagePlus, ArrowUp, Video, Image as ImageIcon, Paperclip
} from "lucide-react";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { formatDistanceToNow } from "date-fns";
import TypingIndicator from "@/components/messages/TypingIndicator";
import MessageBubble from "@/components/messages/MessageBubble";
import { toast } from "sonner";
import ChatLayout from "@/components/chat/ChatLayout";
import AppLayout from "@/components/AppLayout";
import ChatToggle from "@/components/chat/ChatToggle";
import ElevenLabsChat from "@/components/voice-chat/page";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Conversation {
    id: string;
    participant_1: string;
    participant_2: string;
    last_message_at: string;
    other_user: { full_name: string; avatar_url: string | null };
    last_message?: { content: string; sender_id: string; attachment_type?: string | null } | null;
    unread_count: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read: boolean;
    attachment_url?: string | null;
    attachment_type?: string | null;
}

type ChatMode = "direct" | "ai";
interface ImagePreview { file: File; url: string }

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EMOJI_LIST = ["😀", "😂", "😍", "🥰", "😊", "👍", "❤️", "🔥", "🎉", "👏", "💪", "🙏", "😎", "🤗", "😢", "😮", "🤔", "💯", "✨", "🌟", "👋", "🤝", "💕", "😇", "🥳"];
const TYPING_TIMEOUT_MS = 3000;
const MAX_INPUT_HEIGHT_PX = 120;
const MESSAGES_PAGE_SIZE = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format last message preview
// ─────────────────────────────────────────────────────────────────────────────

function getLastMessagePreview(conv: Conversation, userId: string | undefined): string {
    if (!conv.last_message) return "Tap to open";
    const { content, sender_id, attachment_type } = conv.last_message;
    const prefix = sender_id === userId ? "You: " : "";

    if (attachment_type?.startsWith("image/")) {
        return `${prefix}📷 Photo`;
    }
    if (attachment_type) {
        return `${prefix}📎 Attachment`;
    }
    if (content.startsWith("[CALL_LOG:")) {
        return `${prefix}📞 Call`;
    }
    if (content.startsWith("[SYSTEM]")) {
        return content.replace(/^\[SYSTEM\]\s*/, "");
    }
    if (!content) return `${prefix}📎 Attachment`;

    const truncated = content.length > 40 ? content.slice(0, 40) + "…" : content;
    return `${prefix}${truncated}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useDirectChats (with last message + unread count)
// ─────────────────────────────────────────────────────────────────────────────

function useDirectChats(userId: string | undefined) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchConversations = useCallback(async () => {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from("conversations")
                .select("*")
                .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
                .order("last_message_at", { ascending: false });

            if (error) throw error;
            if (!data?.length) { setConversations([]); setLoading(false); return; }

            const otherIds = [...new Set(data.map(c =>
                c.participant_1 === userId ? c.participant_2 : c.participant_1
            ))];
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name, avatar_url")
                .in("user_id", otherIds);

            const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);

            // Fetch last message for each conversation
            const convIds = data.map(c => c.id);

            // Get last message per conversation (batch: get recent messages)
            const { data: lastMsgs } = await supabase
                .from("messages")
                .select("conversation_id, content, sender_id, attachment_type, created_at")
                .in("conversation_id", convIds)
                .order("created_at", { ascending: false });

            // Build map: convId -> last message
            const lastMsgMap = new Map<string, { content: string; sender_id: string; attachment_type?: string | null }>();
            if (lastMsgs) {
                for (const msg of lastMsgs) {
                    if (!lastMsgMap.has(msg.conversation_id)) {
                        lastMsgMap.set(msg.conversation_id, {
                            content: msg.content,
                            sender_id: msg.sender_id,
                            attachment_type: msg.attachment_type,
                        });
                    }
                }
            }

            // Get unread counts per conversation
            const { data: unreadData } = await supabase
                .from("messages")
                .select("conversation_id")
                .in("conversation_id", convIds)
                .neq("sender_id", userId)
                .eq("read", false);

            const unreadMap = new Map<string, number>();
            if (unreadData) {
                for (const msg of unreadData) {
                    unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1);
                }
            }

            setConversations(data.map(c => {
                const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
                const profile = profileMap.get(otherId);
                return {
                    ...c,
                    other_user: { full_name: profile?.full_name ?? "User", avatar_url: profile?.avatar_url ?? null },
                    last_message: lastMsgMap.get(c.id) ?? null,
                    unread_count: unreadMap.get(c.id) ?? 0,
                };
            }));
        } catch (e) {
            console.error("[DirectChats] fetchConversations:", e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchMessages = useCallback(async (conversationId: string) => {
        if (!conversationId || !userId) return;
        try {
            // Fetch latest page of messages
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: false })
                .range(0, MESSAGES_PAGE_SIZE - 1);

            if (error) throw error;

            const sorted = (data ?? []).reverse();
            setMessages(sorted);
            setHasMoreMessages((data?.length ?? 0) === MESSAGES_PAGE_SIZE);

            // Mark as read (fire-and-forget)
            supabase.from("messages").update({ read: true })
                .eq("conversation_id", conversationId)
                .neq("sender_id", userId)
                .eq("read", false)
                .then(() => fetchConversations());
        } catch (e) {
            console.error("[DirectChats] fetchMessages:", e);
        }
    }, [userId, fetchConversations]);

    const loadOlderMessages = useCallback(async (conversationId: string) => {
        if (!conversationId || !userId || loadingMore || !hasMoreMessages) return;
        setLoadingMore(true);
        try {
            const oldestMsg = messages[0];
            if (!oldestMsg) return;

            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conversationId)
                .lt("created_at", oldestMsg.created_at)
                .order("created_at", { ascending: false })
                .range(0, MESSAGES_PAGE_SIZE - 1);

            if (error) throw error;

            const older = (data ?? []).reverse();
            setMessages(prev => [...older, ...prev]);
            setHasMoreMessages((data?.length ?? 0) === MESSAGES_PAGE_SIZE);
        } catch (e) {
            console.error("[DirectChats] loadOlderMessages:", e);
        } finally {
            setLoadingMore(false);
        }
    }, [userId, messages, loadingMore, hasMoreMessages]);

    return {
        conversations, setConversations, messages, setMessages,
        loading, fetchConversations, fetchMessages,
        hasMoreMessages, loadingMore, loadOlderMessages,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: EmojiPicker
// ─────────────────────────────────────────────────────────────────────────────

interface EmojiPickerProps { onSelect: (e: string) => void; onClose: () => void; }
const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => (
    <div className="absolute bottom-11 left-0 bg-card border border-border rounded-2xl shadow-2xl p-3 z-50 grid grid-cols-8 gap-1 w-72">
        {EMOJI_LIST.map(e => (
            <button key={e} onClick={() => { onSelect(e); onClose(); }}
                className="text-xl hover:scale-125 transition-transform p-0.5"
            >{e}</button>
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: InputBar (Direct messages only)
// ─────────────────────────────────────────────────────────────────────────────

interface InputBarProps {
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    imagePreview: ImagePreview | null;
    imageInputRef: RefObject<HTMLInputElement | null>;
    isSending: boolean;
    onImageSelect: (f: File) => void;
    onImageRemove: () => void;
    onSend: () => void;
    onInputChange: () => void;
    showEmoji: boolean;
    setShowEmoji: (v: boolean) => void;
    onEmojiSelect: (e: string) => void;
    canSend: boolean;
}

const InputBar = ({
    textareaRef, imagePreview, imageInputRef, isSending,
    onImageSelect, onImageRemove, onSend,
    onInputChange, showEmoji, setShowEmoji, onEmojiSelect, canSend
}: InputBarProps) => {

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
    };

    const autoGrow = (el: HTMLTextAreaElement) => {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX) + "px";
    };

    return (
        <div className="px-4 py-3 border-t border-border bg-card/90 backdrop-blur-md">
            <div className="max-w-3xl mx-auto">
                {imagePreview && (
                    <div className="mb-2 flex items-center gap-2">
                        <div className="relative flex-shrink-0">
                            <img src={imagePreview.url} className="h-14 w-14 rounded-xl object-cover border border-border" alt="preview" />
                            <button onClick={onImageRemove}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                                aria-label="Remove image"
                            ><X className="h-3 w-3" /></button>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">{imagePreview.file.name}</span>
                    </div>
                )}
                <div className="flex items-end gap-2 bg-muted/40 dark:bg-muted/20 rounded-2xl border border-border/60 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                    <div className="flex items-center gap-0.5 pb-0.5 flex-shrink-0">
                        <input
                            ref={imageInputRef as RefObject<HTMLInputElement>}
                            type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) onImageSelect(f); e.target.value = ""; }}
                        />
                        <button onClick={() => imageInputRef.current?.click()}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Attach image" aria-label="Attach image"
                        ><ImagePlus className="h-4 w-4" /></button>

                        <div className="relative">
                            <button onClick={() => setShowEmoji(!showEmoji)}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                title="Emoji" aria-label="Open emoji picker"
                            ><Smile className="h-4 w-4" /></button>
                            {showEmoji && <EmojiPicker onSelect={onEmojiSelect} onClose={() => setShowEmoji(false)} />}
                        </div>
                    </div>

                    <textarea
                        ref={textareaRef as RefObject<HTMLTextAreaElement>}
                        rows={1}
                        placeholder="Write a message..."
                        onKeyDown={handleKeyDown}
                        onChange={e => { autoGrow(e.target); onInputChange(); }}
                        className="flex-1 bg-transparent outline-none text-sm resize-none leading-relaxed max-h-[120px] overflow-y-auto py-1.5 text-foreground placeholder:text-muted-foreground"
                        style={{ height: "36px" }}
                    />

                    <button
                        onClick={onSend}
                        disabled={isSending || !canSend}
                        className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                        aria-label="Send"
                    >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page: Chats
// ─────────────────────────────────────────────────────────────────────────────

const Chats = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const activeChatId = searchParams.get("chat");
    const mode = (searchParams.get("mode") as ChatMode) ?? "direct";

    // ── Data hooks ──────────────────────────────────────────────────────────
    const {
        conversations, messages, setMessages,
        loading, fetchConversations, fetchMessages,
        hasMoreMessages, loadingMore, loadOlderMessages,
    } = useDirectChats(user?.id);

    // ── UI State ─────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [showEmoji, setShowEmoji] = useState(false);
    const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
    const [canSend, setCanSend] = useState(false);

    // ── Refs ─────────────────────────────────────────────────────────────────
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialLoad = useRef(true);

    // ── Auth guard ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        if (!user) { navigate("/auth", { replace: true }); return; }
        fetchConversations();
    }, [user, authLoading, navigate, fetchConversations]);

    // ── Load messages when active chat changes ───────────────────────────────
    useEffect(() => {
        if (!activeChatId || mode !== "direct") { setMessages([]); return; }
        isInitialLoad.current = true;
        fetchMessages(activeChatId);
    }, [activeChatId, mode, fetchMessages, setMessages]);

    // ── Reset textarea when switching chats / modes ──────────────────────────
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.value = "";
            textareaRef.current.style.height = "36px";
        }
        setCanSend(false);
        setShowEmoji(false);
        if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
        setImagePreview(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChatId, mode]);

    // ── Scroll to bottom on new messages (only for initial load or own messages)
    useEffect(() => {
        if (isInitialLoad.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
            isInitialLoad.current = false;
        } else if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.sender_id === user?.id) {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            } else {
                // If user is near the bottom, auto-scroll
                const container = messagesContainerRef.current;
                if (container) {
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
                    if (isNearBottom) {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }
                }
            }
        }
    }, [messages, user?.id]);

    // ── Revoke object URL on unmount ─────────────────────────────────────────
    useEffect(() => {
        return () => { if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url); };
    }, [imagePreview]);

    // ── Infinite scroll: load older messages on scroll up ────────────────────
    const handleMessagesScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container || !activeChatId) return;
        if (container.scrollTop < 80 && hasMoreMessages && !loadingMore) {
            const prevScrollHeight = container.scrollHeight;
            loadOlderMessages(activeChatId).then(() => {
                // Preserve scroll position after loading older messages
                requestAnimationFrame(() => {
                    if (container) {
                        container.scrollTop = container.scrollHeight - prevScrollHeight;
                    }
                });
            });
        }
    }, [activeChatId, hasMoreMessages, loadingMore, loadOlderMessages]);

    // ── Realtime: Direct messages only ───────────────────────────────────────
    useEffect(() => {
        if (!user?.id || !activeChatId || mode !== "direct") return;

        const channel = supabase.channel(`direct-${activeChatId}`, {
            config: { presence: { key: user.id } }
        });

        channel
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "messages",
                filter: `conversation_id=eq.${activeChatId}`
            }, payload => {
                const msg = payload.new as Message;
                if (msg.sender_id === user.id) return;
                setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
                supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => { });
                fetchConversations();
            })
            .on("broadcast", { event: "typing" }, payload => {
                if (payload.payload?.userId === user.id) return;
                setOtherTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS);
            })
            .on("presence", { event: "sync" }, () => {
                setOnlineUsers(Object.keys(channel.presenceState()));
            })
            .subscribe(status => {
                if (status === "SUBSCRIBED") {
                    channel.track({ userId: user.id, online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [activeChatId, user?.id, mode, fetchConversations, setMessages]);

    // ── Realtime: listen for new messages globally (for conversation list updates)
    useEffect(() => {
        if (!user?.id) return;

        const globalChannel = supabase.channel("global-conv-updates")
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "messages",
            }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => { supabase.removeChannel(globalChannel); };
    }, [user?.id, fetchConversations]);

    // ─────────────────────────────────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────────────────────────────────

    const handleModeChange = useCallback((newMode: ChatMode) => {
        setSearchParams({ mode: newMode });
        setSearchQuery("");
    }, [setSearchParams]);

    const broadcastTyping = useCallback(() => {
        if (!activeChatId || !user?.id || mode !== "direct") return;
        supabase.channel(`direct-${activeChatId}`)
            .send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
    }, [activeChatId, user?.id, mode]);

    const handleInputChange = useCallback(() => {
        const hasText = (textareaRef.current?.value.trim().length ?? 0) > 0;
        setCanSend(hasText || imagePreview !== null);
        broadcastTyping();
    }, [imagePreview, broadcastTyping]);

    const handleImageSelect = useCallback((file: File) => {
        if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
        setImagePreview({ file, url: URL.createObjectURL(file) });
        setCanSend(true);
    }, [imagePreview]);

    const handleImageRemove = useCallback(() => {
        if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
        setImagePreview(null);
        setCanSend((textareaRef.current?.value.trim().length ?? 0) > 0);
    }, [imagePreview]);

    const handleEmojiSelect = useCallback((emoji: string) => {
        if (!textareaRef.current) return;
        textareaRef.current.value += emoji;
        textareaRef.current.focus();
        setCanSend(true);
    }, []);

    const resetTextarea = () => {
        if (!textareaRef.current) return;
        textareaRef.current.value = "";
        textareaRef.current.style.height = "36px";
        setCanSend(false);
    };

    // ── Send: Direct message ─────────────────────────────────────────────────
    const sendDirectMessage = useCallback(async () => {
        if (!user?.id || !activeChatId) return;
        const content = textareaRef.current?.value.trim() ?? "";
        if (!content && !imagePreview) return;

        const pendingImage = imagePreview;
        resetTextarea();
        setImagePreview(null);

        const tempId = `temp-${Date.now()}`;
        const optimistic: Message = {
            id: tempId, conversation_id: activeChatId, sender_id: user.id,
            content, created_at: new Date().toISOString(), read: false,
        };
        setMessages(prev => [...prev, optimistic]);
        setIsSending(true);

        try {
            let attachment_url: string | undefined;
            let attachment_type: string | undefined;

            if (pendingImage) {
                const ext = pendingImage.file.name.split(".").pop() ?? "bin";
                const path = `${user.id}/${Date.now()}.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from("chat-attachments").upload(path, pendingImage.file);
                if (uploadErr) throw new Error("Image upload failed");
                const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
                attachment_url = urlData.publicUrl;
                attachment_type = pendingImage.file.type;
            }

            const { data, error } = await supabase
                .from("messages")
                .insert({ conversation_id: activeChatId, sender_id: user.id, content, attachment_url, attachment_type })
                .select().single();

            if (error) throw error;
            setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m));
            supabase.from("conversations")
                .update({ last_message_at: new Date().toISOString() })
                .eq("id", activeChatId)
                .then(() => fetchConversations());
        } catch (e: any) {
            toast.error(e.message ?? "Failed to send message");
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
        }
    }, [user?.id, activeChatId, imagePreview, setMessages, fetchConversations]);

    const { startCall: startVideoCall, isInCall } = useVideoCall();

    // Derived values
    // ─────────────────────────────────────────────────────────────────────────

    const activeConv = conversations.find(c => c.id === activeChatId);
    const peerId = activeConv
        ? activeConv.participant_1 === user?.id ? activeConv.participant_2 : activeConv.participant_1
        : undefined;
    const isPeerOnline = peerId ? onlineUsers.includes(peerId) : false;

    const filteredConvs = conversations.filter(c =>
        c.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const VideoCallButton = () => {
        if (!activeConv || !peerId) return null;
        return (
            <Button
                variant="ghost" size="icon" className="flex-shrink-0"
                onClick={() => startVideoCall(peerId, activeConv.other_user.full_name, activeConv.other_user.avatar_url)}
                disabled={isInCall}
                title="Video Call"
            >
                <Video className="h-4 w-4" />
            </Button>
        );
    };


    // Sidebar
    // ─────────────────────────────────────────────────────────────────────────

    const SidebarContent = (
        <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost" size="icon" className="h-8 w-8 lg:hidden"
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <ChatToggle mode={mode} onChange={handleModeChange} />
                </div>
                <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => mode === "direct" ? navigate("/feed") : setSearchParams({ mode: "ai" })}
                    aria-label="New conversation"
                >
                    <PenSquare className="h-4 w-4" />
                </Button>
            </div>

            {mode === "direct" && (
                <div className="px-3 py-2 border-b border-border flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search messages"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 border-none bg-muted/40"
                        />
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1">
                {mode === "direct" ? (
                    <div className="py-1">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredConvs.length === 0 ? (
                            <p className="text-center text-xs text-muted-foreground py-8">
                                {searchQuery ? "No results" : "No conversations yet"}
                            </p>
                        ) : filteredConvs.map(conv => {
                            const otherId = conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1;
                            const isOnline = onlineUsers.includes(otherId);
                            const hasUnread = conv.unread_count > 0;
                            const preview = getLastMessagePreview(conv, user?.id);
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setSearchParams({ mode: "direct", chat: conv.id })}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                                        activeChatId === conv.id && "bg-muted/80 border-l-2 border-primary",
                                        hasUnread && activeChatId !== conv.id && "bg-primary/5"
                                    )}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar className="h-11 w-11">
                                            <AvatarImage src={conv.other_user.avatar_url ?? undefined} />
                                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                                                {conv.other_user.full_name[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className={cn(
                                                "text-sm truncate",
                                                hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground"
                                            )}>{conv.other_user.full_name}</span>
                                            <span className={cn(
                                                "text-[10px] flex-shrink-0",
                                                hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                                            )}>
                                                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={cn(
                                                "text-xs truncate",
                                                hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                                            )}>
                                                {preview}
                                            </p>
                                            {hasUnread && (
                                                <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                                    {conv.unread_count > 99 ? "99+" : conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    // AI mode sidebar
                    <div className="py-4 px-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                            <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center overflow-hidden ring-1 ring-border shadow-sm flex-shrink-0">
                                <img src="/logo.png" alt="Health AI" className="h-6 w-6 object-contain" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Health Assistant</p>
                                <p className="text-xs text-muted-foreground">Powered by ElevenLabs</p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 px-1 leading-relaxed">
                            Ask about symptoms, medications, nutrition, fitness, or anything health-related. Supports text and voice.
                        </p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Main Content
    // ─────────────────────────────────────────────────────────────────────────

    const AIPanel = (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex lg:hidden items-center gap-3 bg-card/80 backdrop-blur-md flex-shrink-0">
                <Button
                    variant="ghost" size="icon" className="flex-shrink-0"
                    onClick={() => setSearchParams({ mode: "direct" })}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">Health Assistant</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Online</span>
                    </div>
                </div>
            </div>
            <ElevenLabsChat />
        </div>
    );

    const WelcomeDirect = (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Your Messages</h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">Select a conversation from the sidebar to start chatting.</p>
        </div>
    );

    const ActiveChatView = (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/80 backdrop-blur-md flex-shrink-0">
                <Button
                    variant="ghost" size="icon" className="lg:hidden flex-shrink-0"
                    onClick={() => setSearchParams({ mode: "direct" })}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <div className="relative flex-shrink-0">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={activeConv?.other_user.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                            {activeConv?.other_user.full_name[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                    </Avatar>
                    {isPeerOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">
                        {activeConv?.other_user.full_name ?? "Direct Message"}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <span className={cn(
                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                            isPeerOnline ? "bg-green-500" : "bg-muted-foreground/40"
                        )} />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
                            {isPeerOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>

                <VideoCallButton />
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            {/* Messages with infinite scroll */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-6"
                onScroll={handleMessagesScroll}
            >
                <div className="space-y-4 max-w-3xl mx-auto">
                    {/* Load more indicator */}
                    {loadingMore && (
                        <div className="flex justify-center py-3">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!hasMoreMessages && messages.length > MESSAGES_PAGE_SIZE && (
                        <p className="text-center text-[10px] text-muted-foreground py-2">Beginning of conversation</p>
                    )}

                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center text-center opacity-40 py-20">
                            <MessageCircle className="h-12 w-12 mb-2" />
                            <p className="text-sm">No messages yet. Say hi!</p>
                        </div>
                    )}
                    {messages.map(m => (
                        <MessageBubble
                            key={m.id}
                            msg={m}
                            isMine={m.sender_id === user?.id}
                            onDelete={() => { }}
                        />
                    ))}
                    {otherTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <InputBar
                textareaRef={textareaRef}
                imagePreview={imagePreview}
                imageInputRef={imageInputRef}
                isSending={isSending}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                onSend={sendDirectMessage}
                onInputChange={handleInputChange}
                showEmoji={showEmoji}
                setShowEmoji={setShowEmoji}
                onEmojiSelect={handleEmojiSelect}
                canSend={canSend}
            />
        </div>
    );

    // ── Resolve main content ─────────────────────────────────────────────────
    const mainContent = mode === "ai"
        ? AIPanel
        : activeChatId ? ActiveChatView : WelcomeDirect;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            {showEmoji && (
                <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
            )}

            {/* Desktop: inside AppLayout with Browse/Communities-style wrapper */}
            <div className="hidden lg:block">
                <AppLayout className="p-0">
                    <div className="container max-w-6xl mx-auto p-2 md:p-4">
                        <div className="bg-background rounded-none md:rounded-md overflow-hidden">
                            <ChatLayout
                                sidebarContent={SidebarContent}
                                mainContent={mainContent}
                                showSidebarOnMobile={mode === "direct" && !activeChatId}
                            />
                        </div>
                    </div>
                </AppLayout>
            </div>

            {/* Mobile: fullscreen overlay */}
            <div className="lg:hidden">
                <ChatLayout
                    sidebarContent={SidebarContent}
                    mainContent={mainContent}
                    showSidebarOnMobile={mode === "direct" && !activeChatId}
                />
            </div>
        </>
    );
};

export default Chats;
