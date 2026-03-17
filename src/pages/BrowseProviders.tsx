import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import ProviderCard from "@/components/browse/ProviderCard";
import BrowseFilters from "@/components/browse/BrowseFilters";
import BrowseFilterPopup, { AdvancedFilters, defaultAdvancedFilters } from "@/components/browse/BrowseFilterPopup";
import { Loader2, MoveRight, Stethoscope } from "lucide-react";
import { BrowseProvidersSkeleton } from "@/components/skeletons/PageSkeletons";
import { useGeolocation } from "@/hooks/use-geolocation";

export type Provider = {
  id: string;
  user_id: string;
  provider_type: string;
  bio: string;
  specialization: string;
  experience_years: number;
  hourly_rate: number;
  avg_rating: number;
  total_reviews: number;
  is_available: boolean;
  specializations: string[];
  city: string;
  languages: string[];
  accepting_new_patients: boolean;
  consultation_fee: number;
  home_visit_fee: number;
  consultation_modes: string[];
  currency: string;
  distance_km?: number;
  profile?: { full_name: string; avatar_url: string | null; banner_url?: string | null };
};

const BrowseProviders = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [nearMeActive, setNearMeActive] = useState(false);
  const [radiusKm, setRadiusKm] = useState(25);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const geo = useGeolocation();

  // Haversine distance calculation
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);

      let query = (supabase as any)
        .from("provider_profiles")
        .select("*")
        .eq("is_available", true);

      // Server-side: filter by provider type
      if (typeFilter !== "all") {
        query = query.eq("provider_type", typeFilter);
      }

      // Server-side: filter by accepting new patients
      if (advancedFilters.acceptingNew === true) {
        query = query.eq("accepting_new_patients", true);
      }

      // Server-side: filter by minimum rating
      if (advancedFilters.minRating !== null) {
        query = query.gte("avg_rating", advancedFilters.minRating);
      }

      // Server-side: filter by cities
      if (advancedFilters.cities.length > 0) {
        query = query.in("city", advancedFilters.cities);
      }

      // Server-side: filter by consultation modes (overlaps array)
      if (advancedFilters.consultationModes.length > 0) {
        query = query.overlaps("consultation_modes", advancedFilters.consultationModes);
      }

      // Server-side: filter by languages (overlaps array)
      if (advancedFilters.languages.length > 0) {
        query = query.overlaps("languages", advancedFilters.languages);
      }

      // Server-side: sorting
      if (sortBy === "rating") {
        query = query.order("avg_rating", { ascending: false });
      } else if (sortBy === "experience") {
        query = query.order("experience_years", { ascending: false });
      } else if (sortBy === "price_low") {
        query = query.order("consultation_fee", { ascending: true });
      } else if (sortBy === "price_high") {
        query = query.order("consultation_fee", { ascending: false });
      }

      const { data: providerData } = await query;

      if (providerData) {
        const userIds = providerData.map((p: any) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, banner_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        let enriched: Provider[] = providerData.map((p: any) => {
          const provider: Provider = {
            id: p.id,
            user_id: p.user_id,
            provider_type: p.provider_type,
            bio: p.bio || "",
            specialization: p.specialization || "",
            experience_years: p.experience_years || 0,
            hourly_rate: p.hourly_rate || 0,
            avg_rating: p.avg_rating || 0,
            total_reviews: p.total_reviews || 0,
            is_available: p.is_available ?? true,
            specializations: p.specializations || [],
            city: p.city || "",
            languages: p.languages || [],
            accepting_new_patients: p.accepting_new_patients ?? true,
            consultation_fee: p.consultation_fee || p.hourly_rate || 0,
            home_visit_fee: p.home_visit_fee || 0,
            consultation_modes: p.consultation_modes || [],
            currency: p.currency || "USD",
            profile: profileMap.get(p.user_id) || { full_name: "Provider", avatar_url: null },
          };

          // Calculate distance if user location available
          if (nearMeActive && geo.latitude && geo.longitude && p.latitude && p.longitude) {
            provider.distance_km = Math.round(haversineKm(geo.latitude, geo.longitude, p.latitude, p.longitude) * 10) / 10;
          }

          return provider;
        });

        // If near-me, filter by radius (client-side since it needs user coords)
        if (nearMeActive && geo.latitude && geo.longitude) {
          enriched = enriched.filter(p => p.distance_km != null && p.distance_km <= radiusKm);
          if (sortBy === "nearest") {
            enriched.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
          }
        }

        // Client-side: search query filter (needs profile name)
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          enriched = enriched.filter(p =>
            p.profile?.full_name?.toLowerCase().includes(q) ||
            p.bio?.toLowerCase().includes(q) ||
            p.city?.toLowerCase().includes(q)
          );
        }

        setProviders(enriched);
      }
      setLoading(false);
    };
    fetchProviders();
  }, [nearMeActive, geo.latitude, geo.longitude, radiusKm, typeFilter, sortBy, advancedFilters, searchQuery]);

  return (
    <AppLayout className="p-0">
      <div className="container max-w-6xl mx-auto p-2 md:p-4">
        <Link to="/invitations" className="text-sm text-black  hover:text-primary/80 flex justify-flex justify-between mb-2 p-4 bg-background rounded-none md:rounded-md"> <div>View Invitations</div> <MoveRight /></Link>

        <div className="bg-background p-4 rounded-none md:rounded-md">
          <BrowseFilters
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            nearMeActive={nearMeActive}
            setNearMeActive={setNearMeActive}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            geo={geo}
          />

          {loading ? (
            <BrowseProvidersSkeleton />
          ) : providers.length === 0 ? (
            <div className="text-center py-20">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No providers found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {providers.map(provider => (
                <ProviderCard key={provider.id} provider={provider} nearMeActive={nearMeActive} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BrowseFilterPopup filters={advancedFilters} setFilters={setAdvancedFilters} providers={providers} />
    </AppLayout>
  );
};

export default BrowseProviders;
