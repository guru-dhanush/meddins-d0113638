import { User, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useAppMode } from "@/contexts/AppModeContext";
import { useExplorationMode } from "@/contexts/ExplorationModeContext";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface DesktopNavProps {
    avatarUrl: string | null;
    initials: string;
}

const DesktopNav = ({ avatarUrl, initials }: DesktopNavProps) => {
    const { signOut, userRole } = useAuth();
    const { mode } = useAppMode();
    const { explorationEnabled } = useExplorationMode();
    const { unreadCount } = useUnreadMessages();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const isProvider = userRole === "provider";

    const allNavItems = useMemo(() => [
        { to: "/feed", icon: "/icons/home.svg", label: t("nav.home"), modes: ["all", "care", "community"], roles: ["all"] },
        { to: "/communities", icon: "/icons/community.svg", label: t("nav.communities"), modes: ["all", "community"], roles: ["all"], explorationOnly: true },
        { to: "/providers", icon: "/icons/provider.svg", label: t("nav.browse"), modes: ["all", "care"], roles: ["member", "organization"], explorationOnly: true },
        { to: "/messages", icon: "/icons/message.svg", label: t("nav.chats"), modes: ["all", "care", "community"], roles: ["all"], badgeKey: "messages" },
        { to: "/notifications", icon: "/icons/notification.svg", label: t("nav.notifications"), modes: ["all", "care", "community"], roles: ["all"] },
        { to: "/dashboard", icon: "/icons/calender.svg", label: t("nav.dashboard"), modes: ["all", "care"], roles: ["provider"] },
        { to: "/ai-chat", icon: "/icons/lightbulb.svg", label: t("nav.ai"), modes: ["all", "care"], roles: ["member"], explorationOnly: true },
        { to: "/health-records", icon: "/icons/document.svg", label: t("nav.records"), modes: ["all", "care"], roles: ["member"], explorationOnly: true },
    ], [t]);

    const navItems = useMemo(() => {
        return allNavItems.filter(item => {
            if (!item.modes.includes(mode)) return false;
            // Role filtering
            const matchesRole = item.roles.includes("all") || item.roles.includes(userRole || "member");
            // For providers: explorationOnly items need exploration mode enabled
            if (isProvider && item.explorationOnly && !explorationEnabled) return false;
            // For non-providers: show if role matches (explorationOnly doesn't apply)
            if (!isProvider) return matchesRole || item.roles.includes("all");
            return matchesRole || item.roles.includes("all");
        });
    }, [mode, allNavItems, userRole, isProvider, explorationEnabled]);

    return (
        <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map(({ to, icon, label, badgeKey }) => {
                const badge = badgeKey === "messages" ? unreadCount : 0;
                return (
                    <NavLink
                        key={to}
                        to={to}
                        className="relative flex flex-col items-center justify-center px-4 py-1.5 text-muted-foreground hover:text-foreground transition-all duration-150 min-w-[76px] border-b-2 border-transparent rounded-t-lg hover:bg-accent/50 opacity-50"
                        activeClassName="text-foreground border-b-2 !border-primary opacity-100"
                    >
                        <div className="relative">
                            <img src={icon} alt={label} className="h-6 w-6" />
                            {badge > 0 && (
                                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                                    {badge > 99 ? "99+" : badge}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] font-medium mt-0.5">{label}</span>
                    </NavLink>
                );
            })}

            {/* Me dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex flex-col items-center justify-center px-4 py-1 text-muted-foreground hover:text-foreground transition-colors min-w-[80px] outline-none">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={avatarUrl || undefined} />
                            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-medium mt-0.5 flex items-center gap-0.5">
                            {t("nav.me")} <ChevronDown className="h-3 w-3" />
                        </span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="h-4 w-4 mr-2" /> {t("nav.myProfile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        {t("nav.dashboard")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                        {t("nav.settings")}
                    </DropdownMenuItem>
                    {userRole === "member" && (
                        <DropdownMenuItem onClick={() => navigate("/upgrade-to-provider")}>
                            {t("nav.becomeProvider")}
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { signOut(); navigate("/"); }}>
                        {t("common.signOut")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
    );
};

export default DesktopNav;
