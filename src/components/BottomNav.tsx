import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode, AppMode } from "@/contexts/AppModeContext";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Users, Layers, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const { user } = useAuth();
  const { mode, setMode } = useAppMode();
  const { unreadCount } = useUnreadMessages();
  const [showModeSheet, setShowModeSheet] = useState(false);
  const { t } = useTranslation();

  const modes: { value: AppMode; label: string; icon: typeof Layers; desc: string }[] = [
    { value: "all", label: t("modes.all"), icon: Layers, desc: t("modes.allDesc") },
    { value: "care", label: t("modes.care"), icon: Heart, desc: t("modes.careDesc") },
    { value: "community", label: t("modes.community"), icon: Users, desc: t("modes.communityDesc") },
  ];

  const navItems = useMemo(() => {
    const allItems = [
      { to: "/feed", icon: "/icons/home.svg", label: t("nav.home"), modes: ["all", "care", "community"] },
      { to: "/communities", icon: "/icons/community.svg", label: t("nav.communities"), modes: ["all", "community"] },
      { to: "/providers", icon: "/icons/provider.svg", label: t("nav.browse"), modes: ["all", "care"] },
      { to: "/messages", icon: "/icons/message.svg", label: t("nav.chats"), modes: ["all", "care", "community"], badge: unreadCount },
      { to: user ? `/user/${user.id}` : "/profile", icon: "/icons/setting.svg", label: t("nav.profile"), modes: ["all", "care", "community"] },
    ];
    return allItems.filter(item => item.modes.includes(mode));
  }, [mode, user, unreadCount, t]);

  const handleModeSelect = (newMode: AppMode) => {
    setMode(newMode);
    setShowModeSheet(false);
  };

  const CurrentModeIcon = modes.find(m => m.value === mode)?.icon || Layers;

  return (
    <>
      {/* Mode Selection Sheet */}
      <AnimatePresence>
        {showModeSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowModeSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-2xl border-t border-border shadow-lg pb-8"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h3 className="text-sm font-bold text-foreground">{t("modes.switchMode")}</h3>
                <button onClick={() => setShowModeSheet(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="px-4 pb-4 space-y-1">
                {modes.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => handleModeSelect(value)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      mode === value
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center",
                      mode === value ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                    {mode === value && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 md:hidden">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ to, icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-muted-foreground transition-all duration-150 opacity-50"
              activeClassName="text-primary opacity-100"
            >
              <div className="relative">
                <img src={icon} alt={label} className="h-5 w-5" />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
          {/* Mode Switcher Icon */}
          <button
            onClick={() => setShowModeSheet(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-muted-foreground transition-all duration-150 opacity-60 hover:opacity-100"
          >
            <CurrentModeIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t("nav.mode")}</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
