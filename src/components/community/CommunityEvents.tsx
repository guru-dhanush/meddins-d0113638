import { useState, useEffect, useCallback } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Calendar, Clock, MapPin, Video, Users, Plus, Loader2, CheckCircle, Star, XCircle, Trash2,
} from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CommunityEventsProps {
    communityId: string;
    isModerator: boolean;
}

interface CommunityEvent {
    id: string;
    title: string;
    description: string | null;
    event_type: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
    is_online: boolean;
    meeting_url: string | null;
    max_attendees: number | null;
    attendee_count: number;
    status: string;
    creator_id: string;
}

const EVENT_TYPES = [
    { value: "webinar", label: "Webinar", icon: Video },
    { value: "qa_session", label: "Q&A Session", icon: Users },
    { value: "challenge", label: "Challenge", icon: Star },
    { value: "meetup", label: "Meetup", icon: MapPin },
    { value: "general", label: "General", icon: Calendar },
];

const CommunityEvents = ({ communityId, isModerator }: CommunityEventsProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [myAttendance, setMyAttendance] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Create form
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [eventType, setEventType] = useState("general");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [isOnline, setIsOnline] = useState(true);
    const [meetingUrl, setMeetingUrl] = useState("");
    const [location, setLocation] = useState("");
    const [maxAttendees, setMaxAttendees] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { data } = await (supabase as any)
            .from("community_events")
            .select("*")
            .eq("community_id", communityId)
            .in("status", ["upcoming", "live"])
            .order("start_time", { ascending: true });

        setEvents((data as CommunityEvent[]) || []);

        if (user && data && data.length > 0) {
            const eventIds = data.map((e: any) => e.id);
            const { data: attendances } = await (supabase as any)
                .from("event_attendees")
                .select("event_id, status")
                .eq("user_id", user.id)
                .in("event_id", eventIds);

            const map = new Map<string, string>();
            attendances?.forEach((a: any) => map.set(a.event_id, a.status));
            setMyAttendance(map);
        }

        setLoading(false);
    }, [communityId, user]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleRSVP = async (eventId: string, status: "going" | "interested") => {
        if (!user) return;
        setActionLoading(eventId);
        try {
            const current = myAttendance.get(eventId);
            if (current === status) {
                // Toggle off
                await (supabase as any).from("event_attendees").delete().eq("event_id", eventId).eq("user_id", user.id);
                setMyAttendance(prev => { const m = new Map(prev); m.delete(eventId); return m; });
            } else if (current) {
                // Update
                await (supabase as any).from("event_attendees").update({ status }).eq("event_id", eventId).eq("user_id", user.id);
                setMyAttendance(prev => new Map(prev).set(eventId, status));
            } else {
                // Insert
                await (supabase as any).from("event_attendees").insert({ event_id: eventId, user_id: user.id, status });
                setMyAttendance(prev => new Map(prev).set(eventId, status));
            }
            fetchEvents();
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreate = async () => {
        if (!user || !title.trim() || !startTime) return;
        setCreating(true);
        try {
            const { error } = await (supabase as any).from("community_events").insert({
                community_id: communityId,
                creator_id: user.id,
                title: title.trim(),
                description: desc.trim() || null,
                event_type: eventType,
                start_time: new Date(startTime).toISOString(),
                end_time: endTime ? new Date(endTime).toISOString() : null,
                is_online: isOnline,
                meeting_url: meetingUrl.trim() || null,
                location: location.trim() || null,
                max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
            } as any);

            if (error) throw error;
            toast({ title: "Event created ✓" });
            setDialogOpen(false);
            setTitle(""); setDesc(""); setStartTime(""); setEndTime(""); setMeetingUrl(""); setLocation(""); setMaxAttendees("");
            fetchEvents();
        } catch (err: any) {
            toast({ title: "Failed", description: err.message, variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };
    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    };

    const STATUS_COLORS: Record<string, string> = {
        upcoming: "bg-primary/10 text-primary",
        live: "bg-emerald-500/10 text-emerald-600",
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Events
                </h3>
                {isModerator && (
                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs border-2 rounded-xl" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Create Event
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : events.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-2xl border-2 border-border">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map(event => {
                        const typeInfo = EVENT_TYPES.find(t => t.value === event.event_type) || EVENT_TYPES[4];
                        const myStatus = myAttendance.get(event.id);
                        return (
                            <div key={event.id} className="p-4 rounded-2xl border-2 border-border bg-card space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <typeInfo.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm text-foreground truncate">{event.title}</h4>
                                            <Badge className={`text-[10px] px-1.5 py-0 border-0 ${STATUS_COLORS[event.status] || ""}`}>
                                                {event.status}
                                            </Badge>
                                        </div>
                                        {event.description && <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(event.start_time)}</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(event.start_time)}</span>
                                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {event.attendee_count} going</span>
                                    {event.is_online && <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Online</span>}
                                    {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
                                </div>

                                <div className="flex gap-2 items-center">
                                    <Button
                                        size="sm"
                                        variant={myStatus === "going" ? "default" : "outline"}
                                        className="h-8 text-xs gap-1 rounded-xl border-2"
                                        onClick={() => handleRSVP(event.id, "going")}
                                        disabled={actionLoading === event.id}
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" /> Going
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={myStatus === "interested" ? "default" : "outline"}
                                        className="h-8 text-xs gap-1 rounded-xl border-2"
                                        onClick={() => handleRSVP(event.id, "interested")}
                                        disabled={actionLoading === event.id}
                                    >
                                        <Star className="h-3.5 w-3.5" /> Interested
                                    </Button>
                                    {isModerator && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive ml-auto">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the event and remove all RSVPs.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Keep Event</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground"
                                                        onClick={async () => {
                                                            await (supabase as any).from("event_attendees").delete().eq("event_id", event.id);
                                                            await (supabase as any).from("community_events").delete().eq("id", event.id);
                                                            toast({ title: "Event cancelled" });
                                                            fetchEvents();
                                                        }}
                                                    >
                                                        Cancel Event
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Event Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Event</DialogTitle>
                        <DialogDescription>Schedule a community event</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div><Label className="text-sm font-semibold">Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className="mt-1" /></div>
                        <div><Label className="text-sm font-semibold">Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1 resize-none" maxLength={500} /></div>
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">Type</Label>
                            <div className="flex flex-wrap gap-2">
                                {EVENT_TYPES.map(t => (
                                    <button key={t.value} onClick={() => setEventType(t.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${eventType === t.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"
                                            }`}>{t.label}</button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><Label className="text-sm font-semibold">Start *</Label><Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1" /></div>
                            <div><Label className="text-sm font-semibold">End</Label><Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1" /></div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setIsOnline(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${isOnline ? "border-primary bg-primary/5" : "border-border"}`}>Online</button>
                            <button onClick={() => setIsOnline(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 ${!isOnline ? "border-primary bg-primary/5" : "border-border"}`}>In Person</button>
                        </div>
                        {isOnline ? (
                            <div><Label className="text-sm font-semibold">Meeting URL</Label><Input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://..." className="mt-1" /></div>
                        ) : (
                            <div><Label className="text-sm font-semibold">Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Address" className="mt-1" /></div>
                        )}
                        <div><Label className="text-sm font-semibold">Max Attendees</Label><Input type="number" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} placeholder="Unlimited" className="mt-1" /></div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreate} disabled={creating || !title.trim() || !startTime} className="gap-2">
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create Event
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommunityEvents;
