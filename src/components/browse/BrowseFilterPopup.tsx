import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Building2, Home, Globe, X } from "lucide-react";
import type { Provider } from "@/pages/BrowseProviders";

export type AdvancedFilters = {
  consultationModes: string[];
  languages: string[];
  cities: string[];
  acceptingNew: boolean | null;
  minRating: number | null;
};

export const defaultAdvancedFilters: AdvancedFilters = {
  consultationModes: [],
  languages: [],
  cities: [],
  acceptingNew: null,
  minRating: null,
};

type Props = {
  filters: AdvancedFilters;
  setFilters: (f: AdvancedFilters) => void;
  providers: Provider[];
};

const modeOptions = [
  { value: "video", label: "Video", icon: Video },
  { value: "in-person", label: "In Person", icon: Building2 },
  { value: "chat", label: "Chat", icon: Home },
];

const ratingOptions = [4, 3, 2, 1];

const BrowseFilterPopup = ({ filters, setFilters, providers }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdvancedFilters>(filters);

  const handleOpen = (o: boolean) => {
    if (o) setDraft(filters);
    setOpen(o);
  };

  // Derive unique languages and cities from providers
  const { languages, cities } = useMemo(() => {
    const langSet = new Set<string>();
    const citySet = new Set<string>();
    providers.forEach(p => {
      p.languages?.forEach(l => l && langSet.add(l));
      if (p.city) citySet.add(p.city);
    });
    return {
      languages: Array.from(langSet).sort(),
      cities: Array.from(citySet).sort(),
    };
  }, [providers]);

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const activeCount =
    filters.consultationModes.length +
    filters.languages.length +
    filters.cities.length +
    (filters.acceptingNew !== null ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0);

  const apply = () => {
    setFilters(draft);
    setOpen(false);
  };

  const reset = () => {
    const empty = { ...defaultAdvancedFilters };
    setDraft(empty);
    setFilters(empty);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <button className="fixed right-3 bottom-20 md:bottom-6 z-40 flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity">
          <img src="/icons/filter.svg" alt="Filter" className="h-5 w-5 brightness-0 invert" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Advanced Filters</SheetTitle>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground h-7">
                <X className="h-3 w-3 mr-1" /> Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          {/* Consultation Mode */}
          <div className="py-3">
            <h4 className="text-sm font-medium text-foreground mb-2">Consultation Mode</h4>
            <div className="flex flex-wrap gap-2">
              {modeOptions.map(m => {
                const active = draft.consultationModes.includes(m.value);
                return (
                  <button
                    key={m.value}
                    onClick={() => setDraft({ ...draft, consultationModes: toggleArray(draft.consultationModes, m.value) })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    <m.icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Languages */}
          {languages.length > 0 && (
            <>
              <div className="py-3">
                <h4 className="text-sm font-medium text-foreground mb-2">Languages</h4>
                <div className="flex flex-wrap gap-2">
                  {languages.map(lang => {
                    const active = draft.languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        onClick={() => setDraft({ ...draft, languages: toggleArray(draft.languages, lang) })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Cities */}
          {cities.length > 0 && (
            <>
              <div className="py-3">
                <h4 className="text-sm font-medium text-foreground mb-2">City</h4>
                <div className="flex flex-wrap gap-2">
                  {cities.map(city => {
                    const active = draft.cities.includes(city);
                    return (
                      <button
                        key={city}
                        onClick={() => setDraft({ ...draft, cities: toggleArray(draft.cities, city) })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Min Rating */}
          <div className="py-3">
            <h4 className="text-sm font-medium text-foreground mb-2">Minimum Rating</h4>
            <div className="flex flex-wrap gap-2">
              {ratingOptions.map(r => {
                const active = draft.minRating === r;
                return (
                  <button
                    key={r}
                    onClick={() => setDraft({ ...draft, minRating: active ? null : r })}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {r}+ ★
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Accepting New Patients */}
          <div className="py-3">
            <h4 className="text-sm font-medium text-foreground mb-2">Availability</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={draft.acceptingNew === true}
                onCheckedChange={(c) => setDraft({ ...draft, acceptingNew: c ? true : null })}
              />
              <span className="text-sm text-foreground">Accepting new patients only</span>
            </label>
          </div>
        </ScrollArea>

        {/* Apply button */}
        <div className="p-4 border-t border-border">
          <Button onClick={apply} className="w-full">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BrowseFilterPopup;
