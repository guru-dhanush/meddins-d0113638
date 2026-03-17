import { Briefcase } from "lucide-react";
import ProfileSectionCard from "./ProfileSectionCard";

interface ExperienceEntry {
  title: string;
  company: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  location: string;
  description: string;
}

interface ExperienceSectionProps {
  experience: ExperienceEntry[];
  canEdit: boolean;
  onEdit?: () => void;
}

const ExperienceSection = ({ experience, canEdit, onEdit }: ExperienceSectionProps) => (
  <ProfileSectionCard
    title="Experience"
    icon={<Briefcase className="h-4 w-4 text-primary" />}
    canEdit={canEdit}
    onEdit={onEdit}
    isEmpty={experience.length === 0}
    emptyText="No experience added yet."
  >
    <div className="space-y-4">
      {experience.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="mt-0.5 w-px bg-border self-stretch ml-4 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              {entry.company}{entry.employment_type ? ` · ${entry.employment_type}` : ""}
            </p>
            {(entry.start_date || entry.end_date) && (
              <p className="text-xs text-muted-foreground">{entry.start_date} — {entry.end_date || "Present"}</p>
            )}
            {entry.location && <p className="text-xs text-muted-foreground">{entry.location}</p>}
            {entry.description && <p className="text-xs text-foreground mt-1">{entry.description}</p>}
          </div>
        </div>
      ))}
    </div>
  </ProfileSectionCard>
);

export default ExperienceSection;
