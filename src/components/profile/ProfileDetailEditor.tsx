import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, MapPin, LocateFixed } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { getCurrencyList, CURRENCIES } from "@/lib/currency";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type EditorSection =
  | "education" | "certifications" | "skills" | "experience" | "about"
  | "personal" | "professional" | "pricing" | "location";

interface ProfileDetailEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: EditorSection;
  data: any;
  onSave: (section: string, data: any) => Promise<void>;
}

// ─── Location Editor with Map ────────────────────────────────────────────────
const LocationEditor = ({ formData, updateForm }: { formData: Record<string, any>; updateForm: (key: string, value: any) => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const createMarkerIcon = () => L.divIcon({
    className: "custom-marker",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(221.2, 83.2%, 53.3%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.county || "";
        const road = addr.road || addr.pedestrian || "";
        const houseNumber = addr.house_number || "";
        const fullAddress = [houseNumber, road].filter(Boolean).join(" ") || data.display_name?.split(",").slice(0, 2).join(",") || "";
        if (city) updateForm("city", city);
        if (fullAddress) updateForm("address", fullAddress);
      }
    } catch {
      // silently fail
    }
  }, [updateForm]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: createMarkerIcon(), draggable: true }).addTo(mapInstanceRef.current);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current?.getLatLng();
        if (pos) {
          updateForm("latitude", Number(pos.lat.toFixed(6)));
          updateForm("longitude", Number(pos.lng.toFixed(6)));
          reverseGeocode(pos.lat, pos.lng);
        }
      });
    }
  }, [updateForm, reverseGeocode]);

  useEffect(() => {
    if (!mapRef.current) return;
    const lat = formData.latitude || 20;
    const lng = formData.longitude || 0;
    const zoom = formData.latitude ? 15 : 2;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      updateForm("latitude", Number(e.latlng.lat.toFixed(6)));
      updateForm("longitude", Number(e.latlng.lng.toFixed(6)));
      placeMarker(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    if (formData.latitude && formData.longitude) {
      placeMarker(formData.latitude, formData.longitude);
    }

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => { map.remove(); mapInstanceRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      updateForm("latitude", lat);
      updateForm("longitude", lng);
      placeMarker(lat, lng);
      mapInstanceRef.current?.setView([lat, lng], 15);
      reverseGeocode(lat, lng);
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Click map to set location</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleUseCurrentLocation}>
            <LocateFixed className="h-3 w-3" /> Use current
          </Button>
        </div>
        <div ref={mapRef} className="w-full h-52 rounded-lg border border-border overflow-hidden" />
      </div>
      <div className="space-y-2">
        <Label>City</Label>
        <Input value={formData.city || ""} onChange={e => updateForm("city", e.target.value)} placeholder="e.g. New York" />
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={formData.address || ""} onChange={e => updateForm("address", e.target.value)} placeholder="Street address or area" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Latitude</Label>
          <Input type="number" step="any" value={formData.latitude ?? ""} onChange={e => updateForm("latitude", e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div className="space-y-2">
          <Label>Longitude</Label>
          <Input type="number" step="any" value={formData.longitude ?? ""} onChange={e => updateForm("longitude", e.target.value ? Number(e.target.value) : null)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Drag the pin or click the map to update. City & address auto-fill from the pin.</p>
    </div>
  );
};

const ProfileDetailEditor = ({ open, onOpenChange, section, data, onSave }: ProfileDetailEditorProps) => {
  const [items, setItems] = useState<any[]>(Array.isArray(data) ? [...data] : []);
  const [text, setText] = useState(typeof data === "string" ? data : "");
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state for object-based sections (personal, professional, pricing, location)
  const [formData, setFormData] = useState<Record<string, any>>(
    typeof data === "object" && data !== null && !Array.isArray(data) ? { ...data } : {}
  );

  // Reset state when data/section changes
  useEffect(() => {
    if (Array.isArray(data)) setItems([...data]);
    else if (typeof data === "string") setText(data);
    else if (typeof data === "object" && data !== null) setFormData({ ...data });
  }, [data, section]);

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    if (section === "about") {
      await onSave(section, text);
    } else if (["personal", "professional", "pricing", "location"].includes(section)) {
      await onSave(section, formData);
    } else {
      await onSave(section, items);
    }
    setSaving(false);
    onOpenChange(false);
  };

  const addItem = () => {
    if (section === "education") {
      setItems([...items, { institution: "", degree: "", field: "", start_date: "", end_date: "" }]);
    } else if (section === "certifications") {
      setItems([...items, { name: "", issuer: "", issue_date: "", expiry_date: "", credential_url: "" }]);
    } else if (section === "experience") {
      setItems([...items, { title: "", company: "", employment_type: "", start_date: "", end_date: "", location: "", description: "" }]);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !items.includes(skillInput.trim())) {
      setItems([...items, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const titleMap: Record<string, string> = {
    about: "Edit About",
    education: "Edit Education",
    certifications: "Edit Certifications",
    skills: "Edit Skills",
    experience: "Edit Experience",
    personal: "Edit Personal Info",
    professional: "Edit Professional Details",
    pricing: "Edit Pricing",
    location: "Edit Location",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleMap[section]}</DialogTitle>
        </DialogHeader>

        {/* About */}
        {section === "about" && (
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Tell people about yourself..." maxLength={2000} />
          </div>
        )}

        {/* Personal Info */}
        {section === "personal" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={formData.full_name || ""} onChange={e => updateForm("full_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone || ""} onChange={e => updateForm("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={formData.bio || ""} onChange={e => updateForm("bio", e.target.value)} placeholder="Tell us about yourself..." rows={3} />
            </div>
          </div>
        )}

        {/* Professional Details (provider only) */}
        {section === "professional" && (
          <div className="space-y-4">
            {/* Basic */}
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select value={formData.provider_type || "doctor"} onValueChange={v => updateForm("provider_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="caretaker">Caretaker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input value={formData.specialization || ""} onChange={e => updateForm("specialization", e.target.value)} placeholder="e.g. Cardiology" />
            </div>
            <div className="space-y-2">
              <Label>Specializations (comma-separated)</Label>
              <Input
                value={(formData.specializations || []).join(", ")}
                onChange={e => updateForm("specializations", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="e.g. Cardiology, Internal Medicine"
              />
              <p className="text-xs text-muted-foreground">Multiple specializations separated by commas</p>
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" min={0} value={formData.experience_years || 0} onChange={e => updateForm("experience_years", Number(e.target.value))} />
            </div>

            <Separator />

            {/* Personal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender || ""} onValueChange={v => updateForm("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={formData.date_of_birth || ""} onChange={e => updateForm("date_of_birth", e.target.value || null)} />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <Label>Professional Email</Label>
              <Input type="email" value={formData.email || ""} onChange={e => updateForm("email", e.target.value)} placeholder="doctor@clinic.com" />
            </div>

            <Separator />

            {/* Languages & Consultation */}
            <div className="space-y-2">
              <Label>Languages (comma-separated)</Label>
              <Input
                value={(formData.languages || []).join(", ")}
                onChange={e => updateForm("languages", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="e.g. English, Hindi, Spanish"
              />
            </div>
            <div className="space-y-2">
              <Label>Consultation Modes (comma-separated)</Label>
              <Input
                value={(formData.consultation_modes || []).join(", ")}
                onChange={e => updateForm("consultation_modes", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                placeholder="e.g. In-person, Video, Home visit"
              />
            </div>

            <Separator />

            {/* License */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input value={formData.license_number || ""} onChange={e => updateForm("license_number", e.target.value)} placeholder="MED-12345" />
              </div>
              <div className="space-y-2">
                <Label>License Expiry</Label>
                <Input type="date" value={formData.license_expiry || ""} onChange={e => updateForm("license_expiry", e.target.value || null)} />
              </div>
            </div>

            <Separator />

            {/* Toggles */}
            <div className="flex items-center gap-3">
              <Switch checked={formData.available ?? true} onCheckedChange={v => updateForm("available", v)} />
              <Label>Available for bookings</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.accepting_new_patients ?? true} onCheckedChange={v => updateForm("accepting_new_patients", v)} />
              <Label>Accepting new patients</Label>
            </div>
            <div className="space-y-2">
              <Label>Booking Mode</Label>
              <Select value={formData.booking_mode || "public"} onValueChange={v => updateForm("booking_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — Members can book directly</SelectItem>
                  <SelectItem value="private">Private — Members must connect first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Pricing (provider only) */}
        {section === "pricing" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={formData.currency || "USD"} onValueChange={v => updateForm("currency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getCurrencyList().map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const sym = CURRENCIES[formData.currency || "USD"]?.symbol || "$";
              return (
                <>
                  <div className="space-y-2">
                    <Label>Consultation Fee ({sym})</Label>
                    <Input type="number" min={0} value={formData.consultation_fee || 0} onChange={e => updateForm("consultation_fee", Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Home Visit Fee ({sym})</Label>
                    <Input type="number" min={0} value={formData.home_visit_fee || 0} onChange={e => updateForm("home_visit_fee", Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hourly Rate ({sym})</Label>
                    <Input type="number" min={0} value={formData.hourly_rate || 0} onChange={e => updateForm("hourly_rate", Number(e.target.value))} />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Location (provider only) */}
        {section === "location" && (
          <LocationEditor formData={formData} updateForm={updateForm} />
        )}

        {/* Skills */}
        {section === "skills" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button type="button" onClick={addSkill} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((skill: string, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
                  {skill}
                  <button onClick={() => removeItem(i)} className="hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {section === "education" && (
          <div className="space-y-4">
            {items.map((entry, i) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg relative">
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                <div className="space-y-1"><Label className="text-xs">Institution</Label><Input value={entry.institution} onChange={e => updateItem(i, "institution", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Degree</Label><Input value={entry.degree} onChange={e => updateItem(i, "degree", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Field</Label><Input value={entry.field} onChange={e => updateItem(i, "field", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="month" value={entry.start_date} onChange={e => updateItem(i, "start_date", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="month" value={entry.end_date} onChange={e => updateItem(i, "end_date", e.target.value)} /></div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Education</Button>
          </div>
        )}

        {/* Certifications */}
        {section === "certifications" && (
          <div className="space-y-4">
            {items.map((entry, i) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg relative">
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={entry.name} onChange={e => updateItem(i, "name", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Issuer</Label><Input value={entry.issuer} onChange={e => updateItem(i, "issuer", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Issue Date</Label><Input type="month" value={entry.issue_date} onChange={e => updateItem(i, "issue_date", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Expiry Date</Label><Input type="month" value={entry.expiry_date} onChange={e => updateItem(i, "expiry_date", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Credential URL</Label><Input value={entry.credential_url} onChange={e => updateItem(i, "credential_url", e.target.value)} placeholder="https://..." /></div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Certification</Button>
          </div>
        )}

        {/* Experience */}
        {section === "experience" && (
          <div className="space-y-4">
            {items.map((entry, i) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg relative">
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
                <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={entry.title} onChange={e => updateItem(i, "title", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Company</Label><Input value={entry.company} onChange={e => updateItem(i, "company", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Type</Label><Input value={entry.employment_type} onChange={e => updateItem(i, "employment_type", e.target.value)} placeholder="Full-time, Part-time..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="month" value={entry.start_date} onChange={e => updateItem(i, "start_date", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="month" value={entry.end_date} onChange={e => updateItem(i, "end_date", e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={entry.location} onChange={e => updateItem(i, "location", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={entry.description} onChange={e => updateItem(i, "description", e.target.value)} rows={2} /></div>
              </div>
            ))}
            <Button variant="outline" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Experience</Button>
          </div>
        )}

        <Separator />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDetailEditor;
