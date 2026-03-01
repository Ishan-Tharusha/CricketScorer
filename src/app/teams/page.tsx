"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeys } from "@/lib/query-keys";
import { TableSkeleton } from "@/components/loaders/table-skeleton";
import { Spinner } from "@/components/ui/spinner";

interface Team {
  _id: string;
  teamName: string;
  playerIds: string[];
}

interface TeamStats {
  matchCount: number;
  winCount: number;
}

interface Player {
  _id: string;
  fullName: string;
  shortName?: string;
}

const addTeamSchema = z.object({
  teamName: z.string().min(1, "Team name required"),
  playerIds: z.array(z.string()),
});
type AddTeamFormData = z.infer<typeof addTeamSchema>;

async function fetchTeamsWithStats(): Promise<{ teams: Team[]; statsMap: Record<string, TeamStats> }> {
  const r = await fetch("/api/teams");
  const data = await r.json();
  const teams = Array.isArray(data) ? (data as Team[]) : [];
  const statsMap: Record<string, TeamStats> = {};
  if (teams.length > 0) {
    const results = await Promise.all(
      teams.map((t) =>
        fetch(`/api/teams/${t._id}/stats`)
          .then((res) => res.json())
          .then((s) => ({ id: t._id, stats: s }))
          .catch(() => ({ id: t._id, stats: null }))
      )
    );
    results.forEach(({ id, stats }) => {
      if (stats && typeof stats.matchCount === "number") {
        statsMap[id] = { matchCount: stats.matchCount, winCount: stats.winCount ?? 0 };
      }
    });
  }
  return { teams, statsMap };
}

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const teamsQuery = useQuery({
    queryKey: queryKeys.teamsWithStats(),
    queryFn: fetchTeamsWithStats,
  });
  const teams = teamsQuery.data?.teams ?? [];
  const statsMap = teamsQuery.data?.statsMap ?? {};
  const isLoading = teamsQuery.isLoading;
  const isRefetching = teamsQuery.isRefetching;
  const isError = teamsQuery.isError;
  /** Show skeleton on initial load and when user clicks Refresh (so loading is always visible). */
  const showLoadingTable = isLoading || isRefetching;
  const statsLoading = isLoading;

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addError, setAddError] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);

  useEffect(() => {
    if (showAddDialog) {
      fetch("/api/players?light=1")
        .then((r) => r.json())
        .then((d) => (Array.isArray(d) ? setPlayers(d) : setPlayers([])));
    }
  }, [showAddDialog]);

  const { register, handleSubmit, setValue, watch, reset } = useForm<AddTeamFormData>({
    resolver: zodResolver(addTeamSchema),
    defaultValues: { teamName: "", playerIds: [] },
  });
  const playerIds = watch("playerIds") ?? [];

  function addPlayer(pid: string) {
    if (!pid || playerIds.includes(pid)) return;
    setValue("playerIds", [...playerIds, pid]);
    setPlayerSearch("");
    setPlayerDropdownOpen(false);
  }

  function removePlayer(pid: string) {
    setValue(
      "playerIds",
      playerIds.filter((x) => x !== pid)
    );
  }

  const availableToAdd = players.filter((p) => !playerIds.includes(p._id));
  const searchLower = playerSearch.trim().toLowerCase();
  const filteredPlayers =
    searchLower === ""
      ? availableToAdd
      : availableToAdd.filter(
          (p) =>
            p.fullName.toLowerCase().includes(searchLower) ||
            (p.shortName?.toLowerCase().includes(searchLower) ?? false)
        );

  const playersInTeam = playerIds
    .map((pid) => players.find((p) => p._id === pid))
    .filter(Boolean) as Player[];

  async function onAddTeam(data: AddTeamFormData) {
    setAddError("");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setAddError("Failed to create team");
      return;
    }
    setShowAddDialog(false);
    reset({ teamName: "", playerIds: [] });
    setPlayerSearch("");
    setPlayerDropdownOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.teams() });
    queryClient.invalidateQueries({ queryKey: queryKeys.teamsWithStats() });
  }

  function handleCloseAddDialog(open: boolean) {
    if (!open) {
      setShowAddDialog(false);
      setAddError("");
      reset({ teamName: "", playerIds: [] });
      setPlayerSearch("");
      setPlayerDropdownOpen(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 active:bg-white/20 -ml-1 rounded-xl min-h-[44px] min-w-[44px]" asChild>
          <Link href="/">←</Link>
        </Button>
        <h1 className="text-lg sm:text-xl font-bold flex-1 text-center truncate">Teams</h1>
        <div className="w-10 shrink-0" />
      </header>
      <main className="page-content-wide">
        <div className="flex flex-wrap items-center justify-end gap-2 mb-4 sm:mb-5">
          <Button
            variant="outline"
            size="sm"
            className="h-11 min-h-[44px] rounded-xl px-4"
            onClick={() => teamsQuery.refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            size="default"
            className="h-11 min-h-[44px] rounded-xl bg-cricket-green text-white hover:bg-cricket-green/90 border border-cricket-green shadow-md font-medium px-5"
            onClick={() => setShowAddDialog(true)}
          >
            Create
          </Button>
        </div>
        {showLoadingTable ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2" aria-live="polite">
              <Spinner className="h-4 w-4 shrink-0 border-cricket-green border-t-transparent text-cricket-green" />
              {isRefetching ? "Refreshing teams…" : "Loading teams…"}
            </p>
            <TableSkeleton columns={["left", "right", "right", "right"]} rows={5} />
          </div>
        ) : isError ? (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load teams</p>
              <p className="text-sm text-muted-foreground mb-4">Check your connection and try again.</p>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => teamsQuery.refetch()} disabled={isRefetching}>
                {isRefetching ? "Retrying…" : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-2">No teams yet</p>
              <Button
                variant="link"
                className="text-primary p-0 h-auto min-h-0"
                onClick={() => setShowAddDialog(true)}
              >
                Create your first team →
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Team</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Players</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Matches</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => {
                    const stats = statsMap[t._id];
                    return (
                      <tr key={t._id} className="border-b border-border/80 hover:bg-muted/30 transition-colors">
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <Link href={`/teams/${t._id}`} className="font-medium text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-cricket-green/30 rounded">
                            {t.teamName}
                          </Link>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{t.playerIds?.length ?? 0}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{statsLoading && !stats ? "…" : (stats ? stats.matchCount : "—")}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{statsLoading && !stats ? "…" : (stats ? stats.winCount : "—")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      <Dialog open={showAddDialog} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add team</DialogTitle>
            <DialogDescription>Create a new team and add players.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddTeam)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-teamName">Team name *</Label>
              <Input
                id="add-teamName"
                {...register("teamName")}
                placeholder="e.g. Tigers XI"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Players</Label>
              <div className="relative">
                <Input
                  placeholder="Type to search and select player..."
                  value={playerSearch}
                  onChange={(e) => {
                    setPlayerSearch(e.target.value);
                    setPlayerDropdownOpen(true);
                  }}
                  onFocus={() => setPlayerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setPlayerDropdownOpen(false), 150)}
                  className="h-11 pr-9"
                />
                {playerDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-48 overflow-auto">
                    {filteredPlayers.length === 0 ? (
                      <div className="py-3 px-3 text-sm text-muted-foreground">
                        {availableToAdd.length === 0 ? "All players added" : "No matches"}
                      </div>
                    ) : (
                      filteredPlayers.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          className="w-full cursor-pointer text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none rounded-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addPlayer(p._id);
                          }}
                        >
                          {p.fullName}
                          {p.shortName ? ` (${p.shortName})` : ""}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto rounded-md border border-input">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-2.5 px-3 font-semibold text-foreground">Player</th>
                      <th className="w-20 text-right py-2.5 px-3 font-semibold text-foreground">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playersInTeam.map((p) => (
                      <tr key={p._id} className="border-b border-border/80">
                        <td className="py-2.5 px-3">{p.fullName}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive"
                            onClick={() => removePlayer(p._id)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {playersInTeam.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-4 px-3 text-center text-muted-foreground">
                          No players yet. Type above to add.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {addError && (
              <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{addError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleCloseAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cricket-green text-white hover:bg-cricket-green/90">
                Create Team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
