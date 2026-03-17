import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Stethoscope, LayoutDashboard, User, PenSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FeedProfileCardProps {
    profile: {
        full_name: string;
        avatar_url: string | null;
    } | null;
}

const FeedProfileCard = ({ profile }: FeedProfileCardProps) => {
    const { user, userRole } = useAuth();
    const navigate = useNavigate();

    if (!user || !profile) return null;

    const initials = profile.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "?";

    const isProvider = userRole === "provider";

    return (
        <Card className="overflow-hidden">
            {/* Cover gradient */}
            <div className="h-16 bg-gradient-to-r from-primary/40 via-primary/20 to-accent/30" />

            <CardContent className="px-4 pb-4 -mt-8">
                {/* Avatar */}
                <div className="flex justify-center">
                    <Avatar
                        className="h-16 w-16 border-4 border-card cursor-pointer"
                        onClick={() => navigate("/profile")}
                    >
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Name & role */}
                <div className="text-center mt-2">
                    <h3
                        className="font-semibold text-foreground text-sm cursor-pointer hover:underline"
                        onClick={() => navigate("/profile")}
                    >
                        {profile.full_name || "User"}
                    </h3>
                    {isProvider && (
                        <Badge variant="secondary" className="mt-1 gap-1 text-xs">
                            <Stethoscope className="h-3 w-3" />
                            Healthcare Professional
                        </Badge>
                    )}
                    {!isProvider && (
                        <p className="text-xs text-muted-foreground mt-0.5">Member</p>
                    )}
                </div>

                <Separator className="my-3" />

                {/* Quick links */}
                <nav className="space-y-0.5">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => navigate("/profile")}
                        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    >
                        <User className="h-3.5 w-3.5" />
                        My Profile
                    </button>
                    <button
                        onClick={() => navigate("/post")}
                        className="flex items-center gap-2.5 w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                    >
                        <PenSquare className="h-3.5 w-3.5" />
                        Create Post
                    </button>
                </nav>
            </CardContent>
        </Card>
    );
};

export default FeedProfileCard;
