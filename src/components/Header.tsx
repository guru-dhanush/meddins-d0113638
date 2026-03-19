import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProfileSidebar from "@/components/ProfileSidebar";
import DesktopNav from "@/components/DesktopNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CreatePostModal from "./CreatePostModal";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("U");
  const [searchValue, setSearchValue] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAvatarUrl(data.avatar_url);
          setFullName(data.full_name || "");
          setInitials(
            (data.full_name || user.email || "U").charAt(0).toUpperCase(),
          );
        }
      });
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background backdrop-blur-xl border-b border-border/60">
        <div className="container max-w-6xl px-4 md:px-0 flex items-center justify-between h-14 gap-3">

          {/* ─── Mobile: Avatar (opens sidebar) ─── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <div className="lg:hidden">
                <ProfileSidebar>
                  <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Avatar className="h-9 w-9 cursor-pointer">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </ProfileSidebar>
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild className="lg:hidden">
                <Link to="/auth">{t("common.signIn")}</Link>
              </Button>
            )}

            {/* Desktop: Logo */}
            <Link to="/feed" className="hidden lg:flex items-center flex-shrink-0">
              <img src="/logo.png" alt="Meddin" className="h-10" />
            </Link>
          </div>

          {/* ─── Center: Search ─── */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md lg:max-w-md ml-4 mr-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 h-9 bg-muted border-primary/20 rounded-full text-sm hover:bg-muted transition-colors max-w-72"
              />
            </div>
          </form>

          {/* ─── Mobile: New Post (+) + Messages icons ─── */}
          {user && (
            <div className="flex items-center gap-1 flex-shrink-0 lg:hidden">
              <button
                onClick={() => setShowPostModal(true)}
                className="p-1.5 rounded-full hover:bg-accent transition-colors"
                title={t("nav.newPost")}
              >
                <img src="/icons/new-post.svg" alt={t("nav.newPost")} className="h-7 w-7" />
              </button>
              <Link
                to="/messages"
                className="p-1.5 rounded-full hover:bg-accent transition-colors"
              >
                <img src="/icons/message.svg" alt={t("nav.chats")} className="h-7 w-7" />
              </Link>
            </div>
          )}

          {/* ─── Desktop: LinkedIn-style nav ─── */}
          {user && (
            <DesktopNav avatarUrl={avatarUrl} initials={initials} />
          )}

          {/* Desktop: Sign in buttons when logged out */}
          {!user && (
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/auth">{t("common.signIn")}</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/auth?tab=signup">{t("common.getStarted")}</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Create Post Modal (triggered by mobile + icon) */}
      {showPostModal && (
        <CreatePostModal
          onClose={() => setShowPostModal(false)}
          userProfile={{ full_name: fullName, avatar_url: avatarUrl }}
        />
      )}
    </>
  );
};

export default Header;
