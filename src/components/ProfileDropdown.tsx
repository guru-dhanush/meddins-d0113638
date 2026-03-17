import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LayoutDashboard, LogOut, Stethoscope, HeartPulse, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProfileDropdown = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isProvider = userRole === "provider";
  const isOrg = userRole === "organization";

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
        <Button asChild>
          <Link to="/auth?tab=signup">Get Started</Link>
        </Button>
      </div>
    );
  }

  const initials = user.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <span className="text-sm text-foreground truncate">{user.email}</span>
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <Badge
            variant="secondary"
            className={`text-xs ${isOrg ? "bg-primary/10 text-primary" : isProvider ? "bg-primary/10 text-primary" : "bg-secondary/20 text-secondary-foreground"}`}
          >
            {isOrg ? <Building2 className="h-3 w-3 mr-1" /> : isProvider ? <Stethoscope className="h-3 w-3 mr-1" /> : <HeartPulse className="h-3 w-3 mr-1" />}
            {isOrg ? "Organization" : isProvider ? "Provider" : "Patient"}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(isOrg ? "/org/dashboard" : "/dashboard")} className="cursor-pointer">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(isOrg ? "/org/profile/edit" : "/profile")} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          {isOrg ? "Org Profile" : "My Profile"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { signOut(); navigate("/"); }} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
