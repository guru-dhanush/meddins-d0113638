import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Stethoscope, UserRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SelectRole = () => {
  const [role, setRole] = useState<"member" | "provider" | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, refreshRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!role || !user) return;
    setLoading(true);

    try {
      // Insert user role — 'member' maps to enum 'member', 'provider' maps to enum 'provider'
      const dbRole = role as any;
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: dbRole });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      // Update profile with name from Google
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      await supabase
        .from("profiles")
        .update({ full_name: fullName, avatar_url: avatarUrl })
        .eq("user_id", user.id);

      // If provider, create provider_profiles entry
      if (role === "provider") {
        const { error: provError } = await supabase
          .from("provider_profiles")
          .insert({
            user_id: user.id,
            provider_type: "doctor",
            hourly_rate: 0,
            verification_status: "none",
          } as any);

        if (provError && !provError.message.includes("duplicate")) {
          throw provError;
        }
      }

      await refreshRole();
      navigate(role === "provider" ? "/profile" : "/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-7 w-7 text-primary fill-primary" />
          <span className="font-display text-2xl font-bold text-foreground">Meddin</span>
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Meddin!</CardTitle>
            <CardDescription>How will you be using Meddin?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => setRole("member")}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${role === "member"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
                }`}
            >
              <div className={`p-3 rounded-full ${role === "member" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <UserRound className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">I'm seeking care</p>
                <p className="text-sm text-muted-foreground">Browse and book healthcare providers</p>
              </div>
            </button>

            <button
              onClick={() => setRole("provider")}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${role === "provider"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
                }`}
            >
              <div className={`p-3 rounded-full ${role === "provider" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">I'm a Healthcare Professional</p>
                <p className="text-sm text-muted-foreground">Offer your services and manage consultations</p>
              </div>
            </button>

            <Button
              onClick={handleContinue}
              className="w-full mt-4"
              disabled={!role || loading}
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SelectRole;
