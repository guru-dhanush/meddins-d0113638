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
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

interface DesktopNavProps {
    avatarUrl: string | null;
    initials: string;
}

const allNavItems = [
    { to: "/feed", icon: "/icons/home.svg", label: "Home", modes: ["all", "care", "community"] },
    { to: "/communities", icon: "/icons/community.svg", label: "Communities", modes: ["all", "community"] },
    { to: "/providers", icon: "/icons/provider.svg", label: "Browse", modes: ["all", "care"] },
    { to: "/messages", icon: "/icons/message.svg", label: "Chats", modes: ["all", "care", "community"], badgeKey: "messages" },
    { to: "/notifications", icon: "/icons/notification.svg", label: "Notifications", modes: ["all", "care", "community"] },
    { to: "/ai-chat", icon: "/icons/lightbulb.svg", label: "AI", modes: ["all", "care"] },
    { to: "/health-records", icon: "/icons/document.svg", label: "Records", modes: ["all", "care"] },
];

const DesktopNav = ({ avatarUrl, initials }: DesktopNavProps) => {
    const { signOut, userRole } = useAuth();
    const { mode } = useAppMode();
    const { unreadCount } = useUnreadMessages();
    const navigate = useNavigate();

    const navItems = useMemo(() => {
        return allNavItems.filter(item => item.modes.includes(mode));
    }, [mode]);

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
                            Me <ChevronDown className="h-3 w-3" />
                        </span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="h-4 w-4 mr-2" /> My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                        Settings
                    </DropdownMenuItem>
                    {userRole === "member" && (
                        <DropdownMenuItem onClick={() => navigate("/upgrade-to-provider")}>
                            Become a Professional
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { signOut(); navigate("/"); }}>
                        Sign Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
    );
};

export default DesktopNav;
