import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Heart, Search, Star, MapPin, Clock, DollarSign,
  Stethoscope, UserRound, ShieldCheck, Loader2,
  LayoutGrid, List, Building2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";

type Provider = {
  id: string;
  user_id: string;
  provider_type: string;
  bio: string;
  experience_years: number;
  hourly_rate: number;
  avatar_url: string | null;
  full_name: string;
  location: string;
  latitude?: number;
  longitude?: number;
};

type Org = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" as const },
  }),
};

const typeIcon = (type: string) => {
  if (type === "doctor") return <Stethoscope className="h-3.5 w-3.5" />;
  if (type === "nurse") return <Heart className="h-3.5 w-3.5" />;
  return <UserRound className="h-3.5 w-3.5" />;
};

type ViewMode = "grid" | "list";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dbProviders, setDbProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, description, logo_url");
      if (orgData) setOrgs(orgData);
    };
    fetchOrgs();
  }, []);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);

      const { data: providerData } = await (supabase as any)
        .from("provider_profiles")
        .select("*")
        .eq("is_available", true);

      if (providerData && providerData.length > 0) {
        const userIds = providerData.map((p: any) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enriched: Provider[] = providerData.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          provider_type: p.provider_type,
          bio: p.bio || "",
          experience_years: p.experience_years || 0,
          hourly_rate: p.hourly_rate || 0,
          avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
          full_name: profileMap.get(p.user_id)?.full_name || "Provider",
          location: p.city || "",
          latitude: p.latitude,
          longitude: p.longitude,
        }));
        setDbProviders(enriched);
      }
      setLoading(false);
    };
    fetchProviders();
  }, []);

  const filtered = dbProviders
    .filter(p => {
      if (typeFilter !== "all" && p.provider_type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.full_name?.toLowerCase().includes(q) ||
          p.bio?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q)
        );
      }
      return true;
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="pt-24 pb-4 md:pt-28 md:pb-6">
        <div className="container">
          <div className="max-w-2xl mx-auto mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialty, or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-full border-border"
              />
            </div>
          </div>

          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="container pb-20">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { label: "All", value: "all", icon: ShieldCheck },
            { label: "Doctors", value: "doctor", icon: Stethoscope },
            { label: "Nurses", value: "nurse", icon: Heart },
            { label: "Caretakers", value: "caretaker", icon: UserRound },
          ].map(cat => (
            <button
              key={cat.value}
              onClick={() => setTypeFilter(cat.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${typeFilter === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No providers found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              : "flex flex-col gap-4"
          }>
            {filtered.map((provider, i) => (
              <motion.div key={provider.id} initial="hidden" animate="visible" variants={fadeUp} custom={i}>
                <Link to={`/provider/${provider.id}`}>
                  {viewMode === "grid" ? (
                    <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-border/60 overflow-hidden group">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {provider.avatar_url ? (
                          <img src={provider.avatar_url} alt={provider.full_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserRound className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-background/90 text-foreground backdrop-blur-sm gap-1 capitalize text-xs font-medium">
                            {typeIcon(provider.provider_type)} {provider.provider_type}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground truncate mb-1">{provider.full_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{provider.location || "—"}</span>
                          <span className="mx-1">·</span>
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{provider.experience_years}y exp</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{provider.bio}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            {provider.hourly_rate}/hr
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="hover:shadow-md transition-all cursor-pointer border-border/60">
                      <CardContent className="p-4 flex gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                          {provider.avatar_url ? (
                            <img src={provider.avatar_url} alt={provider.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserRound className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">{provider.full_name}</h3>
                            <Badge variant="outline" className="text-xs capitalize gap-1">
                              {typeIcon(provider.provider_type)} {provider.provider_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{provider.bio || "No bio yet"}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.location || "—"}</span>
                            <span>{provider.experience_years}y exp</span>
                            <span className="font-medium text-foreground">${provider.hourly_rate}/hr</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Organizations */}
        {orgs.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Organizations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgs.map(org => (
                <Card key={org.id} className="hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{org.name}</h3>
                      {org.description && <p className="text-sm text-muted-foreground line-clamp-1">{org.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
