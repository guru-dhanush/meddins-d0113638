import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, List } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ProfileLocationViewProps {
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const ProfileLocationView = ({ city, address, latitude, longitude }: ProfileLocationViewProps) => {
  const [viewMode, setViewMode] = useState<string>(latitude && longitude ? "map" : "details");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hasCoords = latitude != null && longitude != null;
  const hasDetails = city || address;

  useEffect(() => {
    if (viewMode !== "map" || !hasCoords || !mapRef.current) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [latitude!, longitude!],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([latitude!, longitude!], { icon }).addTo(map);
      mapInstanceRef.current = map;

      // Force resize
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, latitude, longitude, hasCoords]);

  if (!hasCoords && !hasDetails) {
    return <p className="text-sm text-muted-foreground text-center py-2">No location set</p>;
  }

  if (!hasCoords) {
    // Only details available
    return (
      <div className="text-sm space-y-1.5">
        {city && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground">{city}</span>
          </div>
        )}
        {address && <p className="text-muted-foreground pl-5.5">{address}</p>}
      </div>
    );
  }

  return (
    <Tabs value={viewMode} onValueChange={setViewMode}>
      <TabsList className="grid w-full grid-cols-2 mb-3">
        <TabsTrigger value="map" className="text-xs gap-1.5">
          <MapPin className="h-3 w-3" /> Map
        </TabsTrigger>
        <TabsTrigger value="details" className="text-xs gap-1.5">
          <List className="h-3 w-3" /> Details
        </TabsTrigger>
      </TabsList>

      <TabsContent value="map" className="mt-0">
        <div ref={mapRef} className="w-full h-48 rounded-lg border border-border overflow-hidden" />
        {(city || address) && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {city && (
              <Badge variant="secondary" className="text-xs gap-1">
                <MapPin className="h-2.5 w-2.5" /> {city}
              </Badge>
            )}
            {address && (
              <span className="text-xs text-muted-foreground">{address}</span>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="details" className="mt-0">
        <div className="text-sm space-y-1.5">
          {city && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">City</span>
              <span className="font-medium text-foreground">{city}</span>
            </div>
          )}
          {address && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-foreground text-right max-w-[60%]">{address}</span>
            </div>
          )}
          {hasCoords && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinates</span>
              <span className="font-medium text-foreground text-xs">{latitude!.toFixed(4)}, {longitude!.toFixed(4)}</span>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ProfileLocationView;
