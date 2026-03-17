import { Navigation, Loader2, Stethoscope, Heart, UserRound, Star, TrendingUp, ArrowDownAZ, ArrowUpAZ, MapPin } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Props = {
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  nearMeActive: boolean;
  setNearMeActive: (v: boolean) => void;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  geo: { loading: boolean; requestLocation: () => void; clearLocation: () => void };
};

const typeFilters = [
  { label: "All", value: "all", icon: Star },
  { label: "Doctors", value: "doctor", icon: Stethoscope },
  { label: "Nurses", value: "nurse", icon: Heart },
  { label: "Caretakers", value: "caretaker", icon: UserRound },
];

const sortOptions = [
  { label: "Top Rated", value: "rating", icon: Star },
  { label: "Experienced", value: "experience", icon: TrendingUp },
  { label: "Price ↑", value: "price_low", icon: ArrowDownAZ },
  { label: "Price ↓", value: "price_high", icon: ArrowUpAZ },
];

const radiusOptions = [5, 10, 25, 50];

const BrowseFilters = ({
  typeFilter, setTypeFilter,
  sortBy, setSortBy,
  nearMeActive, setNearMeActive,
  radiusKm, setRadiusKm,
  geo,
}: Props) => {
  const handleNearMe = () => {
    if (!nearMeActive) {
      geo.requestLocation();
      setNearMeActive(true);
      setSortBy("nearest");
    } else {
      setNearMeActive(false);
      geo.clearLocation();
      setSortBy("rating");
    }
  };

  return (
    <ScrollArea className="w-full mb-4">
      <div className="flex items-center gap-1.5 pb-2">
        {/* Near Me pill */}
        <button
          onClick={handleNearMe}
          disabled={geo.loading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${nearMeActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
        >
          {geo.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
          Near Me
        </button>

        {/* Radius pills when near me active */}
        {nearMeActive && radiusOptions.map(r => (
          <button
            key={r}
            onClick={() => setRadiusKm(r)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${radiusKm === r
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            <MapPin className="h-3 w-3" />
            {r}km
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* Type filters */}
        {typeFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${typeFilter === f.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            <f.icon className="h-3 w-3" />
            {f.label}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* Sort options */}
        {nearMeActive && (
          <button
            onClick={() => setSortBy("nearest")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${sortBy === "nearest"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            <Navigation className="h-3 w-3" />
            Nearest
          </button>
        )}
        {sortOptions.map(s => (
          <button
            key={s.value}
            onClick={() => setSortBy(s.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${sortBy === s.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default BrowseFilters;
