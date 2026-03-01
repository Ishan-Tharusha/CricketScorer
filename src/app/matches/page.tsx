"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryKeys } from "@/lib/query-keys";
import { MatchListSkeleton } from "@/components/loaders/match-card-skeleton";
import { Spinner } from "@/components/ui/spinner";

interface Match {
  _id: string;
  matchName: string;
  date: string;
  status: string;
  teamAId: string;
  teamBId: string;
  updatedAt?: string;
  createdByUserId?: string;
}

interface Team {
  _id: string;
  teamName: string;
}

interface MatchesResponse {
  matches: Match[];
  total: number;
}

async function fetchMatches(params: string): Promise<MatchesResponse> {
  const r = await fetch(`/api/matches${params}`);
  const data = await r.json();
  if (data?.matches && Array.isArray(data.matches)) {
    return { matches: data.matches, total: typeof data.total === "number" ? data.total : data.matches.length };
  }
  return { matches: [], total: 0 };
}

async function fetchTeams(): Promise<Team[]> {
  const r = await fetch("/api/teams");
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

const PAGE_SIZE = 10;

/** e.g. "27 Feb 2026" */
function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** e.g. "match-13" → "Match #13"; custom names unchanged */
function matchDisplayName(matchName: string): string {
  const m = /^match-(\d+)$/i.exec(matchName);
  return m ? `Match #${m[1]}` : matchName;
}

export default function MatchesPage() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState<"all" | "IN_PROGRESS" | "COMPLETED">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const userId = session?.user?.id;
  const playerId = (session?.user as { playerId?: string } | undefined)?.playerId;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("status", filter);
    if (userId) p.set("forUser", userId);
    if (playerId) p.set("forPlayer", playerId);
    p.set("limit", String(PAGE_SIZE));
    p.set("page", String(currentPage));
    return `?${p.toString()}`;
  }, [filter, userId, playerId, currentPage]);

  const matchesQuery = useQuery({
    queryKey: queryKeys.matches(filter, userId ?? undefined, playerId ?? undefined, currentPage),
    queryFn: () => fetchMatches(params),
    enabled: true,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams(),
    queryFn: fetchTeams,
  });

  const matchesData = matchesQuery.data ?? { matches: [], total: 0 };
  const matches = matchesData.matches;
  const totalMatches = matchesData.total;

  const teams = useMemo(() => {
    const data = Array.isArray(teamsQuery.data) ? teamsQuery.data : [];
    const map: Record<string, Team> = {};
    data.forEach((t: Team) => { map[t._id] = t; });
    return map;
  }, [teamsQuery.data]);

  const isLoading = matchesQuery.isLoading;
  const isRefetching = matchesQuery.isRefetching;
  const isError = matchesQuery.isError;
  /** Show card skeleton on initial load and when user clicks Refresh (same as Teams/Players). */
  const showLoading = isLoading || isRefetching;
  const refetch = () => { matchesQuery.refetch(); teamsQuery.refetch(); };

  const totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedMatches = matches;

  const goToPage = (page: number) => setCurrentPage((p) => Math.max(1, Math.min(totalPages, page)));

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 active:bg-white/20 -ml-1 rounded-xl min-h-[44px] min-w-[44px]" asChild>
          <Link href="/">←</Link>
        </Button>
        <h1 className="text-lg sm:text-xl font-bold flex-1 text-center truncate">Match History</h1>
        <div className="w-10 shrink-0" />
      </header>
      <main className="page-content">
        <section className="flex flex-wrap items-center justify-end gap-3 mb-6" aria-label="Actions">
          <Button
            variant="outline"
            size="sm"
            className="h-11 min-h-[44px] rounded-xl px-4 border-gray-300 bg-white hover:bg-gray-50"
            onClick={refetch}
            disabled={isRefetching}
          >
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            size="default"
            className="h-11 min-h-[44px] rounded-xl bg-cricket-green text-white hover:bg-cricket-green/90 border border-cricket-green shadow-md font-semibold px-5"
            asChild
          >
            <Link href="/matches/new">New match</Link>
          </Button>
        </section>
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setCurrentPage(1); }} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-200/80 p-1 rounded-xl h-12 min-h-[48px]">
            <TabsTrigger
              value="all"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-cricket-green data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="IN_PROGRESS"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-cricket-green data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Live
            </TabsTrigger>
            <TabsTrigger
              value="COMPLETED"
              className="rounded-lg text-sm font-medium data-[state=active]:bg-cricket-green data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {showLoading ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2" aria-live="polite">
              <Spinner className="h-4 w-4 shrink-0 border-cricket-green border-t-transparent text-cricket-green" />
              {isRefetching ? "Refreshing matches…" : "Loading matches…"}
            </p>
            <MatchListSkeleton count={3} />
          </div>
        ) : isError ? (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load matches</p>
              <p className="text-sm text-muted-foreground mb-4">Check your connection and try again.</p>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={refetch} disabled={isRefetching}>
                {isRefetching ? "Retrying…" : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : matches.length === 0 ? (
          <Card className="bg-white border border-gray-200/90 shadow-md rounded-2xl">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-2">No matches yet</p>
              <Button variant="link" className="text-primary p-0 h-auto" asChild>
                <Link href="/matches/new">Start a new match →</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
          <ul className="space-y-4">
            {paginatedMatches.map((m) => (
              <Card
                key={m._id}
                className="bg-white border border-gray-200/90 shadow-md rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:border-gray-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995]"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link
                      href={m.status === "IN_PROGRESS" ? `/matches/${m._id}/score` : `/matches/${m._id}/scorecard`}
                      className="min-w-0 flex-1 block cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-foreground truncate text-base group-hover:text-cricket-green transition-colors">
                          {matchDisplayName(m.matchName)}
                        </p>
                        <span
                          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            m.status === "IN_PROGRESS"
                              ? "bg-red-500 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {m.status === "IN_PROGRESS" ? "Live" : "Done"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        {teams[m.teamAId]?.teamName ?? "Team A"} vs {teams[m.teamBId]?.teamName ?? "Team B"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatMatchDate(m.date)}
                      </p>
                    </Link>
                    <div className="shrink-0 sm:flex sm:flex-col sm:items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 min-h-[44px] w-full sm:w-auto rounded-xl px-4 border-gray-300"
                        asChild
                      >
                        <Link href={`/matches/new?rematch=${m._id}`} onClick={(e) => e.stopPropagation()}>
                          Rematch
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 safe-area-pb">
              <p className="text-sm text-muted-foreground">
                {totalMatches === 0 ? "0 matches" : `Showing ${startIndex + 1}–${startIndex + paginatedMatches.length} of ${totalMatches}`}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 min-h-[44px] rounded-xl px-4"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 min-h-[44px] rounded-xl px-4"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </>
        )}
      </main>
    </div>
  );
}
