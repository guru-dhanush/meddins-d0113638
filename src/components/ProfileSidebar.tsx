import { useAuth } from "@/contexts/AuthContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard, LogOut, User, Phone, Stethoscope, HeartPulse, ShieldCheck, Clock, XCircle, ArrowUpRight, PenSquare, Globe, Compass,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useExplorationMode } from "@/contexts/ExplorationModeContext";
import { Switch } from "@/components/ui/switch";

interface ProfileData {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

const ProfileSidebar = ({ children }: { children: React.ReactNode }) => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });

    if (userRole === "provider") {
      supabase
        .from("provider_profiles")
        .select("verification_status")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setVerificationStatus((data as any).verification_status);
        });
    }
  }, [user, userRole]);

  if (!user) return <>{children}</>;

  const initials = (profile?.full_name || user.email || "U").charAt(0).toUpperCase();
  const isProvider = userRole === "provider";
  const isMember = userRole === "member";

  const roleLabel = isProvider ? t("profile.healthcareProfessional") : t("profile.member");
  const RoleIcon = isProvider ? Stethoscope : HeartPulse;

  const VerificationBadge = () => {
    if (!isProvider || !verificationStatus) return null;
    if (verificationStatus === "verified") {
      return <Badge variant="default" className="gap-1 text-xs bg-primary"><ShieldCheck className="h-3 w-3" />{t("profile.verified")}</Badge>;
    }
    if (verificationStatus === "pending") {
      return <Badge variant="secondary" className="gap-1 text-xs"><Clock className="h-3 w-3" />{t("profile.pendingVerification")}</Badge>;
    }
    if (verificationStatus === "rejected") {
      return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" />{t("profile.rejected")}</Badge>;
    }
    return null;
  };

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="sr-only">{t("nav.profile")}</SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-base truncate">
                {profile?.full_name || "User"}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isProvider && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <RoleIcon className="h-3 w-3" />
                {roleLabel}
              </Badge>
            )}
            <VerificationBadge />
          </div>
        </div>

        <Separator />

        <div className="px-6 py-4 space-y-3">
          {profile?.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{profile.phone}</span>
            </div>
          )}
          {!profile?.phone && (
            <p className="text-sm text-muted-foreground">{t("profile.noDetailsAdded")}</p>
          )}
        </div>

        <Separator />

        <div className="px-3 py-3 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => handleNav("/dashboard")}>
            <LayoutDashboard className="h-4 w-4" /> {t("sidebar.dashboard")}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => handleNav("/profile")}>
            <User className="h-4 w-4" /> {t("sidebar.myProfile")}
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => handleNav("/post")}>
            <PenSquare className="h-4 w-4" /> {t("sidebar.createPost")}
          </Button>
        </div>

        {isMember && (
          <>
            <Separator />
            <div className="px-3 py-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-primary text-primary hover:bg-primary/5"
                onClick={() => handleNav("/upgrade-to-provider")}
              >
                <ArrowUpRight className="h-4 w-4" /> {t("sidebar.becomeProvider")}
              </Button>
            </div>
          </>
        )}

        <Separator />

        <div className="px-3 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("settings.language")}
          </span>
          <Select value={i18n.language?.substring(0, 2)} onValueChange={(val) => i18n.changeLanguage(val)}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="fi">Suomi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="px-3 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("sidebar.theme")}</span>
          <ThemeSwitcher />
        </div>

        <Separator />

        <div className="px-3 py-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={() => { signOut(); setOpen(false); navigate("/"); }}
          >
            <LogOut className="h-4 w-4" /> {t("sidebar.signOut")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileSidebar;
