import { Award } from "lucide-react";
import ProfileSectionCard from "./ProfileSectionCard";

interface CertEntry {
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_url: string;
}

interface CertificationsSectionProps {
  certifications: CertEntry[];
  canEdit: boolean;
  onEdit?: () => void;
}

const CertificationsSection = ({ certifications, canEdit, onEdit }: CertificationsSectionProps) => (
  <ProfileSectionCard
    title="Licenses & Certifications"
    icon={<Award className="h-4 w-4 text-primary" />}
    canEdit={canEdit}
    onEdit={onEdit}
    isEmpty={certifications.length === 0}
    emptyText="No certifications added yet."
  >
    <div className="space-y-4">
      {certifications.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="mt-1 h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <Award className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{entry.name}</p>
            <p className="text-xs text-muted-foreground">{entry.issuer}</p>
            {(entry.issue_date || entry.expiry_date) && (
              <p className="text-xs text-muted-foreground">
                Issued {entry.issue_date}{entry.expiry_date ? ` · Expires ${entry.expiry_date}` : ""}
              </p>
            )}
            {entry.credential_url && (
              <a href={entry.credential_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                Show credential
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  </ProfileSectionCard>
);

export default CertificationsSection;
