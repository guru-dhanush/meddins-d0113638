import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Star, X, Clock, Navigation } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { convertAndFormat } from "@/lib/currency";

type Provider = {
  id: string;
  provider_type: string;
  full_name: string;
  avatar_url: string | null;
  avg_rating: number;
  total_reviews: number;
  experience_years: number;
  consultation_fee: number;
  currency?: string;
  specializations: string[];
  city: string;
  bio: string;
  distance_km?: number;
  latitude?: number;
  longitude?: number;
};

interface ProviderMapProps {
  providers: Provider[];
  userLat?: number | null;
  userLng?: number | null;
}

const typeColor: Record<string, string> = {
  doctor: "#2563eb",
  nurse: "#dc2626",
  caretaker: "#16a34a",
};

const createMarkerIcon = (type: string) => {
  const color = typeColor[type] || "#6b7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const ProviderMap = ({ providers, userLat, userLng }: ProviderMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const { userCurrency } = useCurrency();

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = userLat || 20.5937;
    const centerLng = userLng || 78.9629;
    const zoom = userLat ? 11 : 5;

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // User marker
    if (userLat && userLng) {
      const userIcon = L.divIcon({
        className: "user-marker",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 0 0 3px hsl(var(--primary) / 0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
        .bindTooltip("You are here", { direction: "top", offset: [0, -10] });
    }

    // Provider markers
    const bounds: L.LatLngExpression[] = [];
    if (userLat && userLng) bounds.push([userLat, userLng]);

    providers.forEach((p) => {
      if (!p.latitude || !p.longitude) return;
      bounds.push([p.latitude, p.longitude]);

      const marker = L.marker([p.latitude, p.longitude], {
        icon: createMarkerIcon(p.provider_type),
      }).addTo(map);

      marker.on("click", () => {
        setSelectedProvider(p);
      });
    });

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds as L.LatLngExpression[]), { padding: [40, 40] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [providers, userLat, userLng]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ height: "500px" }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Selected provider popup card */}
      {selectedProvider && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-sm mx-auto">
          <Link to={`/provider/${selectedProvider.id}`}>
            <div className="bg-card/95 backdrop-blur-md rounded-xl shadow-lg border border-border overflow-hidden">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedProvider(null);
                  }}
                  className="absolute top-2 right-2 z-10 bg-background/80 rounded-full p-1 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>

                {selectedProvider.avatar_url && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={selectedProvider.avatar_url}
                      alt={selectedProvider.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground text-sm">{selectedProvider.full_name}</h3>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedProvider.provider_type}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {selectedProvider.city && (
                    <span>{selectedProvider.city}</span>
                  )}
                  {selectedProvider.avg_rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      {selectedProvider.avg_rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {selectedProvider.experience_years}y
                  </span>
                  <span className="flex items-center gap-0.5">
                    {convertAndFormat(selectedProvider.consultation_fee, selectedProvider.currency || "USD", userCurrency)}
                  </span>
                  {selectedProvider.distance_km != null && (
                    <span className="flex items-center gap-0.5">
                      <Navigation className="h-3 w-3" />
                      {selectedProvider.distance_km < 1
                        ? `${Math.round(selectedProvider.distance_km * 1000)}m`
                        : `${selectedProvider.distance_km.toFixed(1)}km`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProviderMap;
