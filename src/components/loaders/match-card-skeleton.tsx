"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for a single match list card. Use 2–3 for a loading list. */
export function MatchCardSkeleton() {
  return (
    <Card className="bg-white border border-gray-200/90 shadow-md rounded-2xl overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="shrink-0">
            <Skeleton className="h-10 w-20 sm:w-20 rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <MatchCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
