import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, MapPin, Stethoscope, Heart, UserRound, Languages, Shield, Bookmark, BookmarkCheck } from "lucide-react";
import type { Provider } from "@/pages/BrowseProviders";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertAndFormat } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const typeIcon = (type: string) => {
  if (type === "doctor") return <Stethoscope className="h-3 w-3" />;
  if (type === "nurse") return <Heart className="h-3 w-3" />;
  return <UserRound className="h-3 w-3" />;
};

const ProviderCard = ({ provider, nearMeActive }: { provider: Provider; nearMeActive: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { userCurrency } = useCurrency();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from("saved_providers").select("id").eq("user_id", user.id).eq("provider_id", provider.id).maybeSingle().then(({ data }: any) => setSaved(!!data));
  }, [user, provider.id]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (saved) {
      await (supabase as any).from("saved_providers").delete().eq("user_id", user.id).eq("provider_id", provider.id);
      setSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      await (supabase as any).from("saved_providers").insert({ user_id: user.id, provider_id: provider.id });
      setSaved(true);
      toast({ title: "Saved! 🔖" });
    }
  };

  return (
    <Link to={`/user/${provider.user_id}`}>
      <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-border/60 overflow-hidden">
        {/* Cover / Avatar area */}
        <div className="relative">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 h-24 overflow-hidden">
            {provider.profile?.banner_url && (
              <img src={provider.profile.banner_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          {provider.accepting_new_patients && (
            <div className="absolute top-1.5 right-1.5">
              <Badge className="bg-primary/90 text-white border-0 text-[9px] px-1.5 py-0">
                <Shield className="h-2.5 w-2.5 mr-0.5" /> Open
              </Badge>
            </div>
          )}
          {user && (
            <button onClick={toggleSave} className="absolute top-1.5 left-1.5 p-1 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors">
              {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          )}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-10 w-14 h-14 rounded-full border-2 border-background bg-primary/10 flex items-center justify-center overflow-hidden shadow-sm">
            {provider.profile?.avatar_url ? (
              <img src={provider.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserRound className="h-6 w-6 text-primary" />
            )}
          </div>
        </div>

        <CardContent className="pt-8 pb-4 px-3 text-center">
          {/* Name */}
          <h3 className="font-semibold text-foreground text-sm truncate">{provider.profile?.full_name || "Provider"}</h3>

          {/* Type badge + specialization */}
          <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-0.5 capitalize px-1.5 py-0">
              {typeIcon(provider.provider_type)} {provider.provider_type}
            </Badge>
            {provider.specialization && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {provider.specialization}
              </Badge>
            )}
          </div>

          {/* Bio */}
          {provider.bio && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2 leading-tight">{provider.bio}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center justify-center gap-2 mt-2.5 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              {provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : "New"}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {provider.experience_years}y
            </span>
            <span className="flex items-center gap-0.5">
              {convertAndFormat(provider.consultation_fee || provider.hourly_rate, provider.currency || "USD", userCurrency)}
            </span>
          </div>

          {/* Languages */}
          {provider.languages?.length > 0 && (
            <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
              <Languages className="h-3 w-3" />
              <span className="truncate">{provider.languages.slice(0, 2).join(", ")}</span>
            </div>
          )}

          {/* Location */}
          {(provider.city || provider.distance_km != null) && (
            <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {provider.city && <span>{provider.city}</span>}
              {provider.distance_km != null && (
                <span className="text-primary font-medium">
                  {provider.distance_km < 1
                    ? `${Math.round(provider.distance_km * 1000)}m`
                    : `${provider.distance_km.toFixed(1)}km`}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <Button variant="outline" size="sm" className="w-full mt-3 h-7 text-xs text-primary border-primary/30 hover:bg-primary/5">
            View Profile
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProviderCard;
