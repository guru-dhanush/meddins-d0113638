import { useState } from "react";
import { FileText } from "lucide-react";
import ProfileSectionCard from "./ProfileSectionCard";

interface AboutSectionProps {
  bio: string | null;
  canEdit: boolean;
  onEdit?: () => void;
}

const AboutSection = ({ bio, canEdit, onEdit }: AboutSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const text = bio || "";
  const isLong = text.length > 200;

  return (
    <ProfileSectionCard
      title="About"
      icon={<FileText className="h-4 w-4 text-primary" />}
      canEdit={canEdit}
      onEdit={onEdit}
      isEmpty={!text}
      emptyText="No bio added yet."
    >
      <p className="text-sm text-foreground whitespace-pre-wrap">
        {isLong && !expanded ? text.slice(0, 200) + "..." : text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mt-1"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </ProfileSectionCard>
  );
};

export default AboutSection;
