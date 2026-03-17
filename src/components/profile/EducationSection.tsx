import { GraduationCap } from "lucide-react";
import ProfileSectionCard from "./ProfileSectionCard";

interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
}

interface EducationSectionProps {
  education: EducationEntry[];
  canEdit: boolean;
  onEdit?: () => void;
}

const EducationSection = ({ education, canEdit, onEdit }: EducationSectionProps) => (
  <ProfileSectionCard
    title="Education"
    icon={<GraduationCap className="h-4 w-4 text-primary" />}
    canEdit={canEdit}
    onEdit={onEdit}
    isEmpty={education.length === 0}
    emptyText="No education added yet."
  >
    <div className="space-y-4">
      {education.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="mt-1 h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{entry.institution}</p>
            <p className="text-xs text-muted-foreground">{entry.degree}{entry.field ? ` · ${entry.field}` : ""}</p>
            {(entry.start_date || entry.end_date) && (
              <p className="text-xs text-muted-foreground">{entry.start_date} — {entry.end_date || "Present"}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </ProfileSectionCard>
);

export default EducationSection;
