import { Skeleton } from "@/components/ui/skeleton";

// ─── Feed Page Skeleton ──────────────────────────────────────────────────────
export const FeedSkeleton = () => (
  <div className="container max-w-2xl lg:max-w-6xl px-0 lg:px-4 py-0 lg:py-4">
    <div className="lg:grid lg:grid-cols-[280px_1fr_300px] lg:gap-0">
      {/* Left sidebar skeleton */}
      <div className="hidden lg:block pr-4">
        <div className="sticky top-20 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Center feed skeleton */}
      <div className="border-x border-border">
        {/* Tab bar */}
        <div className="h-12 border-b border-border flex items-center gap-6 px-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Post skeletons */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 border-b border-border space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
            <div className="space-y-2 pl-[52px]">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              {i % 2 === 0 && <Skeleton className="h-40 w-full rounded-lg mt-2" />}
            </div>
            <div className="flex items-center gap-6 pl-[52px] pt-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Right sidebar skeleton */}
      <div className="hidden lg:block pl-4">
        <div className="sticky top-20 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Community Page Skeleton ─────────────────────────────────────────────────
export const CommunitySkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
        <Skeleton className="h-20 w-full" />
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-3/4" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Browse Providers Skeleton ───────────────────────────────────────────────
export const BrowseProvidersSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
        <Skeleton className="h-24 w-full" />
        <div className="p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full -mt-7 border-2 border-card" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-2/3" />
          <div className="flex gap-1 pt-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full rounded-md mt-1" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Messages / Chat Skeleton ────────────────────────────────────────────────
export const MessagesSkeleton = () => (
  <div className="py-1">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-10" />
          </div>
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Profile Page Skeleton ───────────────────────────────────────────────────
export const ProfileSkeleton = () => (
  <div className="container max-w-2xl px-0 sm:px-4 pt-0">
    {/* Banner */}
    <Skeleton className="h-36 sm:h-44 w-full sm:rounded-t-xl" />

    {/* Profile header */}
    <div className="bg-card px-4 sm:px-6 pb-4 border-x border-b border-border sm:rounded-b-xl relative">
      <div className="flex items-end gap-4 -mt-10 sm:-mt-12">
        <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-card flex-shrink-0" />
        <div className="flex-1 pt-12 sm:pt-14 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>

    {/* Tab bar */}
    <div className="flex items-center gap-0 mt-2 border-b border-border bg-card">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-4 w-16 mx-4 my-3" />
      ))}
    </div>

    {/* Content cards */}
    <div className="space-y-3 mt-3 px-0 sm:px-0">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
