import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface RateProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  bookingId: string;
  onRated?: () => void;
}

const RateProviderDialog = ({
  open, onOpenChange, providerId, providerName, bookingId, onRated,
}: RateProviderDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("reviews")
      .select("*")
      .eq("provider_id", providerId)
      .eq("patient_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingReview(data);
          setRating(data.rating);
          setComment(data.comment || "");
        } else {
          setExistingReview(null);
          setRating(0);
          setComment("");
        }
      });
  }, [open, user, providerId]);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);

    try {
      if (existingReview) {
        // Can't update reviews per RLS, so just inform user
        toast({ title: "Already reviewed", description: "You have already reviewed this provider." });
        setSubmitting(false);
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        provider_id: providerId,
        patient_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      // Update provider avg_rating and total_reviews
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("provider_id", providerId);

      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await supabase
          .from("provider_profiles")
          .update({ avg_rating: Math.round(avg * 10) / 10, total_reviews: allReviews.length })
          .eq("id", providerId);
      }

      toast({ title: "Review submitted", description: "Thank you for your feedback!" });
      onRated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {providerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">How was your experience?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-sm font-medium text-foreground">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][displayRating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Comment <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? "Submitting..." : existingReview ? "Already Reviewed" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateProviderDialog;
