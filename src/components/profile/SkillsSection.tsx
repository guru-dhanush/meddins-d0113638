import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProfileSectionCard from "./ProfileSectionCard";

interface SkillsSectionProps {
  skills: string[];
  canEdit: boolean;
  onEdit?: () => void;
}

const SkillsSection = ({ skills, canEdit, onEdit }: SkillsSectionProps) => (
  <ProfileSectionCard
    title="Skills"
    icon={<Lightbulb className="h-4 w-4 text-primary" />}
    canEdit={canEdit}
    onEdit={onEdit}
    isEmpty={skills.length === 0}
    emptyText="No skills added yet."
  >
    <div className="flex flex-wrap gap-2">
      {skills.map((skill, i) => (
        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
      ))}
    </div>
  </ProfileSectionCard>
);

export default SkillsSection;
