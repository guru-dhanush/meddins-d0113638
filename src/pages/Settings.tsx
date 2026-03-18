import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Shield,
  Eye,
  Bell,
  Palette,
  Calendar,
  Lock,
  Database,
  Info,
  Loader2,
  ChevronRight,
  ExternalLink,
  Download,
  Trash2,
  KeyRound,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "ZAR", label: "ZAR — South African Rand" },
];

type UserSettings = {
  profile_visibility: string;
  show_online_status: boolean;
  connection_requests: string;
  message_privacy: string;
  hide_from_search: boolean;
  connection_visibility: string;
  default_consultation_mode: string;
  booking_auto_confirm: boolean;
  booking_buffer_minutes: number;
  cancellation_policy: string;
};

const defaultSettings: UserSettings = {
  profile_visibility: "public",
  show_online_status: true,
  connection_requests: "everyone",
  message_privacy: "everyone",
  hide_from_search: false,
  connection_visibility: "public",
  default_consultation_mode: "in_clinic",
  booking_auto_confirm: false,
  booking_buffer_minutes: 0,
  cancellation_policy: "",
};

const sections = [
  { id: "account", label: "Account", icon: User },
  { id: "privacy", label: "Profile & Privacy", icon: Eye },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "booking", label: "Booking & Calendar", icon: Calendar, providerOnly: true },
  { id: "security", label: "Security", icon: Lock },
  { id: "data", label: "Data & Storage", icon: Database },
  { id: "about", label: "About & Legal", icon: Info },
];

const Settings = () => {
  const { user, userRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { userCurrency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "account";

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const isProvider = userRole === "provider";

  const visibleSections = sections.filter(
    (s) => !s.providerOnly || isProvider
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          profile_visibility: data.profile_visibility,
          show_online_status: data.show_online_status,
          connection_requests: data.connection_requests,
          message_privacy: data.message_privacy,
          hide_from_search: data.hide_from_search,
          connection_visibility: (data as any).connection_visibility || "public",
          default_consultation_mode: data.default_consultation_mode,
          booking_auto_confirm: data.booking_auto_confirm,
          booking_buffer_minutes: data.booking_buffer_minutes,
          cancellation_policy: data.cancellation_policy || "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!user) return;
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(true);

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, ...settings, [key]: value } as any,
        { onConflict: "user_id" }
      );

    setSaving(false);
    if (error) {
      toast.error("Failed to save setting");
      setSettings((s) => ({ ...s, [key]: prev }));
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully");
      setNewPassword("");
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message);
    else {
      toast.success("Confirmation email sent to your new address");
      setNewEmail("");
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    toast.info("Preparing your data export...");

    const [profileRes, bookingsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id),
      supabase.from("bookings").select("*").eq("patient_id", user.id),
    ]);

    const exportData = {
      profile: profileRes.data,
      bookings: bookingsRes.data,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meddin-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleDeleteAccount = async () => {
    toast.error("Account deletion requires admin support. Please contact support@meddin.com");
  };

  const handleClearChats = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("user_id", user.id);
    if (error) toast.error("Failed to clear chat history");
    else toast.success("AI chat history cleared");
  };

  const setActiveSection = (id: string) => {
    setSearchParams({ section: id });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Address
                </CardTitle>
                <CardDescription>Current: {user?.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="New email address"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <Button onClick={handleChangeEmail} size="sm" disabled={!newEmail}>
                  Update Email
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="New password (min 6 characters)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button onClick={handleChangePassword} size="sm" disabled={!newPassword}>
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account, profile, bookings, posts, and all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Delete Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Visibility</CardTitle>
                <CardDescription>Control who can see your profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Profile Visibility</p>
                    <p className="text-xs text-muted-foreground">Who can view your full profile</p>
                  </Label>
                  <Select value={settings.profile_visibility} onValueChange={(v) => updateSetting("profile_visibility", v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="connections">Connections Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Show Online Status</p>
                    <p className="text-xs text-muted-foreground">Let others see when you're online</p>
                  </Label>
                  <Switch checked={settings.show_online_status} onCheckedChange={(v) => updateSetting("show_online_status", v)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Hide from Search</p>
                    <p className="text-xs text-muted-foreground">Don't appear in browse or search results</p>
                  </Label>
                  <Switch checked={settings.hide_from_search} onCheckedChange={(v) => updateSetting("hide_from_search", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Messaging & Connections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Connection Requests</p>
                    <p className="text-xs text-muted-foreground">Who can send you connection requests</p>
                  </Label>
                  <Select value={settings.connection_requests} onValueChange={(v) => updateSetting("connection_requests", v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="nobody">No One</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Message Privacy</p>
                    <p className="text-xs text-muted-foreground">Who can send you direct messages</p>
                  </Label>
                  <Select value={settings.message_privacy} onValueChange={(v) => updateSetting("message_privacy", v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="connections">Connections Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Connection Visibility</p>
                    <p className="text-xs text-muted-foreground">Who can see your connections list</p>
                  </Label>
                  <Select value={settings.connection_visibility} onValueChange={(v) => updateSetting("connection_visibility", v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="connections">Connections Only</SelectItem>
                      <SelectItem value="only_me">Only Me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
                <CardDescription>
                  Manage your notification preferences for bookings, messages, and more.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/notification-settings")} variant="outline" className="w-full justify-between">
                  Open Notification Settings
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Theme</CardTitle>
                <CardDescription>Choose your preferred appearance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "rounded-xl border-2 p-4 text-center text-sm font-medium capitalize transition-all",
                        theme === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Currency</CardTitle>
                <CardDescription>Used for displaying prices across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={userCurrency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        );

      case "booking":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Booking Preferences</CardTitle>
                <CardDescription>Configure how patients book with you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Default Consultation Mode</p>
                    <p className="text-xs text-muted-foreground">Pre-selected mode for new bookings</p>
                  </Label>
                  <Select value={settings.default_consultation_mode} onValueChange={(v) => updateSetting("default_consultation_mode", v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_clinic">In Clinic</SelectItem>
                      <SelectItem value="video">Video Call</SelectItem>
                      <SelectItem value="home_visit">Home Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Auto-Confirm Bookings</p>
                    <p className="text-xs text-muted-foreground">Automatically confirm new booking requests</p>
                  </Label>
                  <Switch checked={settings.booking_auto_confirm} onCheckedChange={(v) => updateSetting("booking_auto_confirm", v)} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">
                    <p className="text-sm font-medium">Buffer Time (minutes)</p>
                    <p className="text-xs text-muted-foreground">Gap between consecutive appointments</p>
                  </Label>
                  <Select
                    value={String(settings.booking_buffer_minutes)}
                    onValueChange={(v) => updateSetting("booking_buffer_minutes", parseInt(v))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="5">5 min</SelectItem>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cancellation Policy</CardTitle>
                <CardDescription>Displayed to patients when booking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="e.g., Free cancellation up to 24 hours before the appointment..."
                  value={settings.cancellation_policy}
                  onChange={(e) => setSettings((s) => ({ ...s, cancellation_policy: e.target.value }))}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => updateSetting("cancellation_policy", settings.cancellation_policy)}
                >
                  Save Policy
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">Coming Soon</Badge>
                  <p className="text-sm text-muted-foreground">2FA will be available in a future update</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Active Sessions</CardTitle>
                <CardDescription>Manage where you're currently signed in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">This Device</p>
                    <p className="text-xs text-muted-foreground">Current session • Active now</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">Active</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    await signOut();
                    navigate("/auth");
                  }}
                >
                  Sign Out All Devices
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case "data":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Health Records
                </CardTitle>
                <CardDescription>Manage your medical documents, lab reports, and prescriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/health-records")} variant="outline" className="w-full justify-between">
                  Open Health Records
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  Export My Data
                </CardTitle>
                <CardDescription>Download a copy of your profile, bookings, and more</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Clear AI Chat History</CardTitle>
                <CardDescription>Delete all your AI assistant conversations</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Chat History
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all AI chats?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your AI conversation history. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearChats}>Clear All</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">About Meddin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="secondary">1.0.0</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Platform</span>
                  <span className="text-sm">Web Application</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-between h-auto py-3" onClick={() => window.open("#", "_blank")}>
                  <span className="text-sm">Terms of Service</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" className="w-full justify-between h-auto py-3" onClick={() => window.open("#", "_blank")}>
                  <span className="text-sm">Privacy Policy</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Support</CardTitle>
                <CardDescription>Need help? Get in touch</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => window.open("mailto:support@meddin.com")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout className="p-0">
      <div className="container max-w-6xl mx-auto p-2 md:p-4">
        <div className="flex items-center justify-between mb-2 p-4 bg-background rounded-none md:rounded-md">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account, privacy, and preferences</p>
          </div>
        </div>

        <div className="bg-background p-4 rounded-none md:rounded-md">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar nav — desktop */}
            <nav className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-20 space-y-1">
                {visibleSections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                        activeSection === s.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Mobile tabs — horizontal scroll, matches Communities FilterPill */}
            <div className="lg:hidden overflow-x-auto -mx-4 px-4">
              <div className="flex gap-1.5 pb-3">
                {visibleSections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        activeSection === s.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
