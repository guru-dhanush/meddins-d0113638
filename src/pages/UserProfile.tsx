import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import BookingDialog from "@/components/BookingDialog";
import {
  Loader2, MessageCircle, MapPin, Clock, Stethoscope,
  DollarSign, CalendarCheck, UserPlus, CheckCircle, Hourglass,
  Lock, Globe, Mail, Pencil, Briefcase, Star, Calendar,
  Languages, Shield, UserCheck, Video, Plus, Trash2, Camera, ImagePlus,
  Settings2, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertAndFormat } from "@/lib/currency";
import PostCard from "@/components/PostCard";
import AboutSection from "@/components/profile/AboutSection";
import EducationSection from "@/components/profile/EducationSection";
import CertificationsSection from "@/components/profile/CertificationsSection";
import SkillsSection from "@/components/profile/SkillsSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import ProfileDetailEditor from "@/components/profile/ProfileDetailEditor";
import type { EditorSection } from "@/components/profile/ProfileDetailEditor";
import SavedTab from "@/components/profile/SavedTab";
import ProfileLocationView from "@/components/profile/ProfileLocationView";
import { ProfileSkeleton } from "@/components/skeletons/PageSkeletons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DashboardAvailabilityEditor from "@/components/availability/AvailabilityEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, Building2, Home } from "lucide-react";

// ─── Service Editor Dialog ───────────────────────────────────────────────────
interface ServiceEditorProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service: any | null;
  providerId: string;
  consultationModes: string[];
  onSaved: () => void;
}


const SERVICE_MODES = [
  { value: "online", label: "Online", icon: Monitor },
  { value: "in_clinic", label: "In-Clinic", icon: Building2 },
  { value: "home_visit", label: "Home Visit", icon: Home },
];

const ServiceEditor = ({ open, onOpenChange, service, providerId, consultationModes, onSaved }: ServiceEditorProps) => {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dur, setDur] = useState("30");
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [modePrices, setModePrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (service) {
      setName(service.name || "");
      setDesc(service.description || "");
      setDur(String(service.duration_minutes || 30));
      setSelectedModes(service.consultation_modes || []);
      // Load per-mode pricing
      const prices: Record<string, string> = {};
      if (service.pricing) {
        Object.entries(service.pricing).forEach(([mode, price]) => {
          prices[mode] = String(price);
        });
      } else if (service.price) {
        // Fallback: apply single price to all modes
        (service.consultation_modes || []).forEach((m: string) => {
          prices[m] = String(service.price);
        });
      }
      setModePrices(prices);
    } else {
      setName(""); setDesc(""); setDur("30"); setSelectedModes([]); setModePrices({});
    }
  }, [service, open]);

  const toggleMode = (mode: string) => {
    setSelectedModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || selectedModes.length === 0) {
      toast({ title: "Please fill in name and select at least one mode", variant: "destructive" });
      return;
    }
    setSaving(true);

    const basePrice = selectedModes.length > 0
      ? Number(modePrices[selectedModes[0]] || 0)
      : 0;

    if (service?.id) {
      await supabase
        .from("services")
        .update({
          name: name.trim(),
          description: desc.trim() || null,
          duration_minutes: Number(dur),
          price: basePrice,
          consultation_modes: selectedModes,
        } as any)
        .eq("id", service.id);

      // Update pricing
      await (supabase as any).from("service_pricing").delete().eq("service_id", service.id);
      const pricingRows = selectedModes.map(mode => ({
        service_id: service.id,
        consultation_mode: mode,
        price: Number(modePrices[mode] || 0),
      }));
      if (pricingRows.length) {
        await (supabase as any).from("service_pricing").insert(pricingRows);
      }
    } else {
      const { data: newService, error } = await supabase
        .from("services")
        .insert({
          provider_id: providerId,
          name: name.trim(),
          description: desc.trim() || null,
          duration_minutes: Number(dur),
          price: basePrice,
          consultation_modes: selectedModes,
        } as any)
        .select("id")
        .single();

      if (error || !newService) {
        toast({ title: "Error", description: error?.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      const pricingRows = selectedModes.map(mode => ({
        service_id: newService.id,
        consultation_mode: mode,
        price: Number(modePrices[mode] || 0),
      }));
      if (pricingRows.length) {
        await (supabase as any).from("service_pricing").insert(pricingRows);
      }
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
    toast({ title: service?.id ? "Service updated" : "Service added" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service?.id ? "Edit Service" : "Add Service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. General Consultation" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brief description of the service..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={dur} onValueChange={setDur}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 20, 30, 45, 60, 90, 120].map(d => (
                  <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Available Modes & Pricing</Label>
            <div className="space-y-2">
              {SERVICE_MODES.map(mode => {
                const isSelected = selectedModes.includes(mode.value);
                return (
                  <div key={mode.value} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMode(mode.value)}
                    />
                    <mode.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1">{mode.label}</span>
                    {isSelected && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={modePrices[mode.value] || ""}
                          onChange={e => setModePrices(prev => ({ ...prev, [mode.value]: e.target.value }))}
                          placeholder="0"
                          className="h-8 w-20 text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// ═════════════════════════════════════════════════════════════════════════════
// ─── Main Profile Page ──────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
const UserProfile = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { userCurrency } = useCurrency();

  const userId = paramId || user?.id;
  const isOwnProfile = user?.id === userId;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preSelectedServiceId, setPreSelectedServiceId] = useState<string | undefined>(undefined);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [connectionCount, setConnectionCount] = useState(0);
  const [editSection, setEditSection] = useState<EditorSection | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("posts");

  // Service & Availability editor state
  const [svcEditorOpen, setSvcEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("profile-media").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return null; }
    const { data: { publicUrl } } = supabase.storage.from("profile-media").getPublicUrl(path);
    return publicUrl;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const url = await uploadFile(file, "avatar");
    if (url) {
      await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
      setProfile((prev: any) => ({ ...prev, avatar_url: url }));
      toast({ title: "Profile picture updated!" });
    }
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBanner(true);
    const url = await uploadFile(file, "banner");
    if (url) {
      await supabase.from("profiles").update({ banner_url: url } as any).eq("user_id", user.id);
      setProfile((prev: any) => ({ ...prev, banner_url: url }));
      toast({ title: "Banner updated!" });
    }
    setUploadingBanner(false);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const fetchPosts = async (uid: string) => {
    const { data: userPosts } = await supabase
      .from("posts")
      .select("id, content, image_url, created_at, category, user_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!userPosts || userPosts.length === 0) { setPosts([]); return; }

    const postIds = userPosts.map(p => p.id);
    const [{ data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
    ]);

    const likesCountMap = new Map<string, number>();
    likesData?.forEach(l => likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1));
    const commentsCountMap = new Map<string, number>();
    commentsData?.forEach(c => commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1));

    setPosts(userPosts.map(p => ({ ...p, likes_count: likesCountMap.get(p.id) || 0, comments_count: commentsCountMap.get(p.id) || 0 })));

    if (user) {
      const { data: likes } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      setLikedPostIds(new Set(likes?.map(l => l.post_id) || []));
    }
  };

  const fetchProviderData = async (pp: any) => {
    if (!pp) return;
    const [{ data: svcData }, { data: availData }, { data: revData }] = await Promise.all([
      (supabase as any).from("services").select("*").eq("provider_id", pp.id).order("created_at"),
      (supabase as any).from("availability").select("*").eq("provider_id", pp.id).eq("is_active", true).order("day_of_week"),
      (supabase as any).from("reviews").select("*, patient:profiles!reviews_patient_id_fkey(full_name, avatar_url)").eq("provider_id", pp.id).order("created_at", { ascending: false }).limit(10),
    ]);

    // Fetch per-mode pricing for services
    const serviceIds = (svcData || []).map((s: any) => s.id);
    let pricingMap = new Map<string, Record<string, number>>();
    if (serviceIds.length) {
      const { data: pricingData } = await (supabase as any).from("service_pricing").select("*").in("service_id", serviceIds);
      (pricingData as any[])?.forEach((p: any) => {
        if (!pricingMap.has(p.service_id)) pricingMap.set(p.service_id, {});
        pricingMap.get(p.service_id)![p.consultation_mode] = Number(p.price);
      });
    }

    setServices((svcData || []).map((s: any) => ({
      ...s,
      consultation_modes: s.consultation_modes || [],
      pricing: pricingMap.get(s.id) || {},
    })));
    setAvailability(availData || []);
    setReviews(revData || []);
  };

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: prof }, { data: roleData }, { data: pp }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("provider_profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(prof);
    setRole(roleData?.role ?? null);
    setProviderProfile(pp);
    await fetchPosts(userId);
    await fetchProviderData(pp);

    const { count } = await supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
    setConnectionCount(count || 0);

    if (user && user.id !== userId) {
      const { data: conn } = await supabase
        .from("connections")
        .select("id, status, requester_id")
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`)
        .maybeSingle();
      if (conn) { setConnectionStatus(conn.status); setConnectionId(conn.id); }
      else { setConnectionStatus(null); setConnectionId(null); }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId, user]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!user || !userId) return;
    setConnectLoading(true);
    const { data, error } = await supabase.from("connections").insert({ requester_id: user.id, receiver_id: userId }).select("id").single();
    setConnectLoading(false);
    if (error) { toast({ title: "Error", description: "Failed to send connection request.", variant: "destructive" }); }
    else { setConnectionStatus("pending"); setConnectionId(data.id); toast({ title: "Connection request sent!" }); }
  };

  const handleMessage = async () => {
    if (!user || !userId) return;
    const p1 = user.id < userId ? user.id : userId;
    const p2 = user.id < userId ? userId : user.id;
    const { data: existing } = await supabase.from("conversations").select("id").eq("participant_1", p1).eq("participant_2", p2).maybeSingle();
    if (existing) { navigate(`/messages?chat=${existing.id}`); }
    else {
      const { data: created } = await supabase.from("conversations").insert({ participant_1: p1, participant_2: p2 }).select("id").single();
      if (created) navigate(`/messages?chat=${created.id}`);
    }
  };

  const handleRequestMessage = async () => {
    if (!user || !userId) return;
    const p1 = user.id < userId ? user.id : userId;
    const p2 = user.id < userId ? userId : user.id;
    const { data: existing } = await supabase.from("conversations").select("id, is_request").eq("participant_1", p1).eq("participant_2", p2).maybeSingle();
    if (existing) {
      navigate(`/messages?chat=${existing.id}`);
    } else {
      const { data: created } = await supabase.from("conversations").insert({ participant_1: p1, participant_2: p2, is_request: true, request_sender_id: user.id } as any).select("id").single();
      if (created) {
        await supabase.from("messages").insert({ conversation_id: created.id, sender_id: user.id, content: "👋 Hi! I'd like to connect with you." });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() } as any).eq("id", created.id);
        toast({ title: "Message request sent!" });
        navigate(`/messages?chat=${created.id}`);
      }
    }
  };

  const handleSaveSection = async (section: string, data: any) => {
    if (!user) return;
    if (["about", "education", "certifications", "skills", "experience"].includes(section)) {
      let updatePayload: any = {};
      if (section === "about") updatePayload.bio = data;
      else if (section === "education") updatePayload.education = data;
      else if (section === "certifications") updatePayload.certifications = data;
      else if (section === "skills") updatePayload.skills = data;
      else if (section === "experience") updatePayload.work_experience = data;

      const { error } = await supabase.from("profiles").update(updatePayload as any).eq("user_id", user.id);
      if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
      setProfile((prev: any) => ({ ...prev, ...updatePayload }));
      toast({ title: "Saved!" });
    }

    if (section === "personal") {
      const { error } = await supabase.from("profiles").update({
        full_name: data.full_name, phone: data.phone, bio: data.bio,
      }).eq("user_id", user.id);
      if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
      setProfile((prev: any) => ({ ...prev, ...data }));
      toast({ title: "Personal info saved!" });
    }

    if (["professional", "pricing", "location"].includes(section)) {
      const providerData: any = { ...data };
      if ("available" in providerData) { providerData.is_available = providerData.available; delete providerData.available; }
      // Map 'address' field to 'location' column (provider_profiles has no 'address' column)
      if ("address" in providerData) {
        providerData.location = providerData.address;
        delete providerData.address;
      }
      // Remove fields that don't exist in provider_profiles schema
      const validColumns = [
        "provider_type", "bio", "specialization", "specializations", "experience_years",
        "hourly_rate", "consultation_fee", "home_visit_fee", "currency", "city", "location",
        "latitude", "longitude", "license_number", "available", "is_available",
        "accepting_new_patients", "booking_mode", "consultation_modes", "languages",
        "verification_status", "verification_document_url", "verification_notes",
      ];
      Object.keys(providerData).forEach(key => {
        if (!validColumns.includes(key)) delete providerData[key];
      });

      if (providerProfile?.id) {
        const { error } = await supabase.from("provider_profiles").update(providerData).eq("id", providerProfile.id);
        if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
        setProviderProfile((prev: any) => ({ ...prev, ...providerData }));
      } else {
        providerData.user_id = user.id;
        const { data: newPP, error } = await supabase.from("provider_profiles").insert(providerData).select().single();
        if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
        if (newPP) setProviderProfile(newPP);
      }
      toast({ title: "Saved!" });
    }
  };

  const handleDeleteService = async (id: string) => {
    await (supabase as any).from("services").delete().eq("id", id);
    setServices(prev => prev.filter(s => s.id !== id));
    toast({ title: "Service removed" });
  };

  const handleDeleteSlot = async (id: string) => {
    await (supabase as any).from("availability").delete().eq("id", id);
    setAvailability(prev => prev.filter(s => s.id !== id));
    toast({ title: "Slot removed" });
  };

  // ─── Loading / Not Found ─────────────────────────────────────────────────
  if (loading) {
    return <AppLayout><ProfileSkeleton /></AppLayout>;
  }
  if (!profile) {
    return <AppLayout className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><h2 className="text-xl font-semibold text-foreground">User not found</h2><Button onClick={() => navigate(-1)}>Go Back</Button></AppLayout>;
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const initials = profile.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "?";
  const isProvider = role === "provider";
  const isConnected = connectionStatus === "accepted";
  const isPending = connectionStatus === "pending";
  const canBook = isProvider && providerProfile && (providerProfile.booking_mode === "public" || isConnected);
  const canMessage = !isOwnProfile && user && isConnected;

  const education = Array.isArray(profile.education) ? profile.education : [];
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const experience = Array.isArray(profile.work_experience) ? profile.work_experience : [];
  const postAuthor = { full_name: profile.full_name || "Unknown", avatar_url: profile.avatar_url || null, role };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ═════════════════════════════════════════════════════════════════════════
  // ─── Render ───────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout className="container max-w-2xl px-0 sm:px-4 pt-0">
      {/* ── Cover Banner ──────────────────────────────────────────────── */}
      <div className="relative h-36 sm:h-44 bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30 sm:rounded-t-xl overflow-hidden">
        {profile.banner_url && (
          <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
        )}
        {isOwnProfile && (
          <>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors shadow-sm"
              disabled={uploadingBanner}
            >
              {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin text-foreground" /> : <ImagePlus className="h-4 w-4 text-foreground" />}
            </button>
          </>
        )}
        {isProvider && providerProfile?.verification_status === "verified" && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary/90 text-white border-0 gap-1 text-xs backdrop-blur-sm">
              <CheckCircle className="h-3 w-3" /> Verified
            </Badge>
          </div>
        )}
      </div>

      {/* ── Profile Header ────────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-6 pb-4 bg-card border-b">
        {/* Avatar — overlapping the banner */}
        <div className="flex justify-between items-start">
          <div className="relative -mt-12 sm:-mt-14">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-card shadow-lg ring-2 ring-background cursor-pointer"
              onClick={() => isOwnProfile && avatarInputRef.current?.click()}
            >
              {uploadingAvatar ? (
                <AvatarFallback className="text-2xl sm:text-3xl bg-primary text-primary-foreground font-bold">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl sm:text-3xl bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
                </>
              )}
            </Avatar>
            {isOwnProfile && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            {isOwnProfile ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditSection("personal")} className="rounded-full">
                  <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="rounded-full">
                  <Settings2 className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </>
            ) : (
              <>
                {canMessage ? (
                  <Button onClick={handleMessage} variant="outline" size="sm" className="rounded-full">
                    <MessageCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Message</span>
                  </Button>
                ) : (
                  !isConnected && (
                    <Button onClick={handleRequestMessage} variant="outline" size="sm" className="rounded-full">
                      <Mail className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Request</span>
                    </Button>
                  )
                )}
                {canBook && (
                  <Button onClick={() => { setPreSelectedServiceId(undefined); setBookingOpen(true); }} size="sm" className="rounded-full">
                    <CalendarCheck className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Book</span>
                  </Button>
                )}
                {!isConnected && !isPending && (
                  <Button onClick={handleConnect} disabled={connectLoading} size="sm" className="rounded-full">
                    {connectLoading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><UserPlus className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Connect</span></>}
                  </Button>
                )}
                {isPending && (
                  <Button disabled variant="secondary" size="sm" className="rounded-full">
                    <Hourglass className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Pending</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Name & Role */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{profile.full_name || "User"}</h1>
            {isProvider && providerProfile?.verification_status === "verified" && (
              <CheckCircle className="h-5 w-5 text-primary fill-primary/20" />
            )}
          </div>
          {isProvider && (
            <p className="text-sm text-muted-foreground capitalize">
              {providerProfile?.specialization ? `${providerProfile.specialization} · ` : ""}{providerProfile?.provider_type || "Provider"}
            </p>
          )}
          {!isProvider && <p className="text-sm text-muted-foreground">Member</p>}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-foreground mt-2 whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
        )}

        {/* Meta Row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
          {providerProfile?.city && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {providerProfile.city}</span>
          )}
          {isProvider && providerProfile?.experience_years > 0 && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {providerProfile.experience_years} yrs</span>
          )}
          {providerProfile?.languages?.length > 0 && (
            <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> {providerProfile.languages.slice(0, 2).join(", ")}</span>
          )}
          {providerProfile?.consultation_modes?.length > 0 && (
            <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> {providerProfile.consultation_modes.join(", ")}</span>
          )}
          {isProvider && providerProfile?.accepting_new_patients !== false && (
            <span className="flex items-center gap-1 text-primary"><Shield className="h-3.5 w-3.5" /> Accepting patients</span>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex gap-4 mt-3 text-sm">
          <span className="cursor-pointer hover:underline" onClick={() => navigate(isOwnProfile ? "/connections" : `/connections/${userId}`)}><strong className="text-foreground">{connectionCount}</strong> <span className="text-muted-foreground">connection{connectionCount !== 1 ? "s" : ""}</span></span>
          {posts.length > 0 && <span><strong className="text-foreground">{posts.length}</strong> <span className="text-muted-foreground">post{posts.length !== 1 ? "s" : ""}</span></span>}
          {isProvider && providerProfile?.avg_rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <strong className="text-foreground">{Number(providerProfile.avg_rating).toFixed(1)}</strong>
              <span className="text-muted-foreground">({providerProfile.total_reviews || 0})</span>
            </span>
          )}
          {isProvider && providerProfile?.consultation_fee > 0 && (
            <span><strong className="text-foreground">{convertAndFormat(providerProfile.consultation_fee, (providerProfile as any)?.currency || "USD", userCurrency)}</strong> <span className="text-muted-foreground">consultation</span></span>
          )}
        </div>
      </div>

      {/* ── Tabbed Content ────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start rounded-none border-b bg-background h-auto p-0 gap-0 overflow-x-auto no-scrollbar scroll-smooth">
          <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm data-[state=active]:shadow-none">
            Posts
          </TabsTrigger>
          {isProvider && (
            <TabsTrigger value="about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm data-[state=active]:shadow-none">
              About
            </TabsTrigger>
          )}
          {isProvider && (
            <TabsTrigger value="services" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm data-[state=active]:shadow-none">
              Services
            </TabsTrigger>
          )}
          {isProvider && (
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm data-[state=active]:shadow-none">
              Reviews
            </TabsTrigger>
          )}
          {isOwnProfile && (
            <TabsTrigger value="saved" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm data-[state=active]:shadow-none">
              Saved
            </TabsTrigger>
          )}
          {isOwnProfile && (
            <TabsTrigger value="health" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm data-[state=active]:shadow-none">
              Health Records
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Posts Tab ─────────────────────────────────────────────── */}
        <TabsContent value="posts" className="space-y-4 mt-4">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No posts yet.</p>
          ) : posts.map((post) => (
            <PostCard key={post.id} post={post} author={postAuthor} isLiked={likedPostIds.has(post.id)} onRefresh={() => userId && fetchPosts(userId)} />
          ))}
        </TabsContent>

        {/* ── About Tab (Provider only) ────────────────────────────── */}
        {isProvider && (
          <TabsContent value="about" className="space-y-4 mt-4">
            {/* Provider details (own profile: editable cards) */}
            {isOwnProfile && (
              <>
                {/* Professional Details */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" /> Professional Details
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setEditSection("professional")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
                    {[
                      ["Type", providerProfile?.provider_type, true],
                      ["Specialization", providerProfile?.specialization],
                      ["Specializations", providerProfile?.specializations?.join(", ")],
                      ["Experience", providerProfile?.experience_years ? `${providerProfile.experience_years} years` : null],
                      ["Gender", providerProfile?.gender?.replace("_", " "), true],
                      ["Email", providerProfile?.email],
                      ["Languages", providerProfile?.languages?.join(", ")],
                      ["Consultation", providerProfile?.consultation_modes?.join(", ")],
                      ["License", providerProfile?.license_number ? `${providerProfile.license_number}${providerProfile.license_expiry ? ` (exp: ${providerProfile.license_expiry})` : ""}` : null],
                      ["Available", providerProfile?.is_available !== false ? "Yes" : "No"],
                      ["Accepting Patients", providerProfile?.accepting_new_patients !== false ? "Yes" : "No"],
                      ["Booking Mode", providerProfile?.booking_mode, true],
                    ].filter(([, val]) => val).map(([label, val, capitalize]) => (
                      <div key={label as string} className="flex justify-between">
                        <span className="text-muted-foreground">{label as string}</span>
                        <span className={`font-medium text-right max-w-[60%] ${capitalize ? "capitalize" : ""}`}>{val as string}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Location with Map/Details toggle */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Location
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditSection("location")}><Pencil className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ProfileLocationView
                      city={providerProfile?.city}
                      address={providerProfile?.location}
                      latitude={providerProfile?.latitude}
                      longitude={providerProfile?.longitude}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {/* Provider visitor view quick info */}
            {!isOwnProfile && providerProfile && (
              <Card>
                <CardContent className="py-4 text-sm space-y-2">
                  {(providerProfile.city || (providerProfile.latitude && providerProfile.longitude)) && (
                    <ProfileLocationView
                      city={providerProfile.city}
                      address={providerProfile.location}
                      latitude={providerProfile.latitude}
                      longitude={providerProfile.longitude}
                    />
                  )}
                  {providerProfile.languages?.length > 0 && (
                    <div className="flex items-center gap-2"><Languages className="h-4 w-4 text-primary flex-shrink-0" /><span>{providerProfile.languages.join(", ")}</span></div>
                  )}
                  {providerProfile.consultation_modes?.length > 0 && (
                    <div className="flex items-center gap-2"><Video className="h-4 w-4 text-primary flex-shrink-0" /><span>{providerProfile.consultation_modes.join(", ")}</span></div>
                  )}
                  {providerProfile.gender && (
                    <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary flex-shrink-0" /><span className="capitalize">{providerProfile.gender.replace("_", " ")}</span></div>
                  )}
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{providerProfile.accepting_new_patients !== false ? "Accepting new patients" : "Not accepting new patients"}</span>
                  </div>
                  {providerProfile.license_number && (
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary flex-shrink-0" /><span>License: {providerProfile.license_number}</span></div>
                  )}
                </CardContent>
              </Card>
            )}

            <AboutSection bio={profile.bio} canEdit={isOwnProfile} onEdit={() => setEditSection("about")} />
            <EducationSection education={education} canEdit={isOwnProfile} onEdit={() => setEditSection("education")} />
            <CertificationsSection certifications={certifications} canEdit={isOwnProfile} onEdit={() => setEditSection("certifications")} />
            <SkillsSection skills={skills} canEdit={isOwnProfile} onEdit={() => setEditSection("skills")} />
            <ExperienceSection experience={experience} canEdit={isOwnProfile} onEdit={() => setEditSection("experience")} />
          </TabsContent>
        )}

        {/* ── Services Tab ──────────────────────────────────────────── */}
        {isProvider && (
          <TabsContent value="services" className=" space-y-4 mt-4">
            {/* Services List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" /> Services
                </CardTitle>
                {isOwnProfile && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setEditingService(null); setSvcEditorOpen(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{isOwnProfile ? "Add your services to let patients know what you offer." : "No services listed yet."}</p>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc) => (
                      <div key={svc.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-foreground">{svc.name}</p>
                            {svc.duration_minutes && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {svc.duration_minutes} min
                              </Badge>
                            )}
                          </div>
                          {svc.description && <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {(svc.consultation_modes || []).map((mode: string) => {
                              const price = svc.pricing?.[mode];
                              const ModeIcon = SERVICE_MODES.find(m => m.value === mode)?.icon || Monitor;
                              const modeLabel = SERVICE_MODES.find(m => m.value === mode)?.label || mode;
                              return (
                                <Badge key={mode} variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                                  <ModeIcon className="h-2.5 w-2.5" />
                                  {modeLabel}: {price != null ? `$${price}` : "Free"}
                                </Badge>
                              );
                            })}
                            {(!svc.consultation_modes || svc.consultation_modes.length === 0) && svc.price > 0 && (
                              <span className="font-semibold text-sm text-foreground">${svc.price}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {!isOwnProfile && canBook && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-full text-xs gap-1"
                              onClick={() => { setPreSelectedServiceId(svc.id); setBookingOpen(true); }}
                            >
                              <CalendarCheck className="h-3 w-3" />
                              <span className="hidden sm:inline">Book</span>
                            </Button>
                          )}
                          {isOwnProfile && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingService(svc); setSvcEditorOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteService(svc.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Availability */}
            {isOwnProfile ? (
              <DashboardAvailabilityEditor providerId={providerProfile.id} />
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availability.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No availability set yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {["online", "in_clinic", "home_visit"].map(mode => {
                        const modeSlots = availability.filter((s: any) => s.consultation_mode === mode);
                        if (modeSlots.length === 0) return null;
                        const ModeIcon = SERVICE_MODES.find(m => m.value === mode)?.icon || Monitor;
                        const modeLabel = SERVICE_MODES.find(m => m.value === mode)?.label || mode;
                        return (
                          <div key={mode}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <ModeIcon className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold text-foreground">{modeLabel}</span>
                            </div>
                            <div className="space-y-1 pl-5">
                              {modeSlots.map((slot: any) => (
                                <div key={slot.id} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground font-medium w-12">{dayNames[slot.day_of_week]}</span>
                                  <span className="font-medium text-foreground">{slot.start_time?.slice(0, 5)} — {slot.end_time?.slice(0, 5)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── Reviews Tab ──────────────────────────────────────────── */}
        {isProvider && (
          <TabsContent value="reviews" className=" space-y-4 mt-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {providerProfile?.avg_rating > 0 && (
                  <div className="flex items-center gap-3 px-1 mb-2">
                    <span className="text-3xl font-bold text-foreground">{Number(providerProfile.avg_rating).toFixed(1)}</span>
                    <div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(providerProfile.avg_rating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{providerProfile.total_reviews || reviews.length} review{(providerProfile.total_reviews || reviews.length) !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
                {reviews.map((rev) => (
                  <Card key={rev.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= rev.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">by {rev.patient?.full_name || "Patient"}</span>
                      </div>
                      {rev.comment && <p className="text-sm text-foreground">{rev.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── Saved Tab ──────────────────────────────────────────── */}
        {isOwnProfile && (
          <TabsContent value="saved" className="mt-4">
            <SavedTab />
          </TabsContent>
        )}

        {/* ── Health Records Tab ─────────────────────────────────── */}
        {isOwnProfile && (
          <TabsContent value="health" className="mt-4">
            <Card>
              <CardContent className="py-8 text-center space-y-3">
                <FileText className="h-10 w-10 mx-auto text-primary/60" />
                <div>
                  <h3 className="font-semibold text-foreground">Health Records Vault</h3>
                  <p className="text-sm text-muted-foreground mt-1">Upload, organize, and share your medical documents securely.</p>
                </div>
                <Button onClick={() => navigate("/health-records")} className="mt-2">
                  Open Health Records
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      {isProvider && providerProfile && (
        <BookingDialog open={bookingOpen} onOpenChange={(v) => { setBookingOpen(v); if (!v) setPreSelectedServiceId(undefined); }} providerId={providerProfile.id} providerName={profile.full_name || "Provider"} preSelectedServiceId={preSelectedServiceId} />
      )}

      {isOwnProfile && isProvider && providerProfile && (
        <ServiceEditor
          open={svcEditorOpen}
          onOpenChange={setSvcEditorOpen}
          service={editingService}
          providerId={providerProfile.id}
          consultationModes={providerProfile.consultation_modes || []}
          onSaved={() => fetchProviderData(providerProfile)}
        />
      )}

      {editSection && (
        <ProfileDetailEditor
          open={!!editSection}
          onOpenChange={(open) => { if (!open) setEditSection(null); }}
          section={editSection}
          data={
            editSection === "about" ? (profile.bio || "") :
              editSection === "education" ? education :
                editSection === "certifications" ? certifications :
                  editSection === "skills" ? skills :
                    editSection === "experience" ? experience :
                      editSection === "personal" ? { full_name: profile.full_name || "", phone: profile.phone || "", bio: profile.bio || "" } :
                        editSection === "professional" ? {
                          provider_type: providerProfile?.provider_type || "doctor",
                          specialization: providerProfile?.specialization || "",
                          specializations: providerProfile?.specializations || [],
                          experience_years: providerProfile?.experience_years || 0,
                          gender: providerProfile?.gender || "",
                          date_of_birth: providerProfile?.date_of_birth || "",
                          email: providerProfile?.email || "",
                          languages: providerProfile?.languages || [],
                          consultation_modes: providerProfile?.consultation_modes || [],
                          license_number: providerProfile?.license_number || "",
                          license_expiry: providerProfile?.license_expiry || "",
                          available: providerProfile?.is_available ?? true,
                          accepting_new_patients: providerProfile?.accepting_new_patients ?? true,
                          booking_mode: providerProfile?.booking_mode || "public",
                        } :
                          editSection === "pricing" ? {
                            consultation_fee: providerProfile?.consultation_fee || 0,
                            home_visit_fee: providerProfile?.home_visit_fee || 0,
                            hourly_rate: providerProfile?.hourly_rate || 0,
                            currency: (providerProfile as any)?.currency || "USD",
                          } :
                            editSection === "location" ? {
                              city: providerProfile?.city || "",
                              address: providerProfile?.location || "",
                              latitude: providerProfile?.latitude || null,
                              longitude: providerProfile?.longitude || null,
                            } :
                              {}
          }
          onSave={async (section, data) => {
            await handleSaveSection(section, data);
            await fetchData();
          }}
        />
      )}
    </AppLayout>
  );
};

export default UserProfile;
