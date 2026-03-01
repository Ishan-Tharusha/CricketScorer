"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

interface Player {
  _id: string;
  fullName: string;
  shortName?: string;
  email?: string;
  isKeeper?: boolean;
  createdBy?: string;
  stats?: {
    matchesPlayed: number;
    runs: number;
    strikeRate: number | null;
    wickets: number;
  };
}

const addPlayerSchema = z.object({
  fullName: z.string().min(1, "Name required"),
  shortName: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional().transform((s) => (s === "" ? undefined : s)),
  isKeeper: z.boolean().optional(),
});
type AddPlayerFormData = z.infer<typeof addPlayerSchema>;

const PAGE_SIZE = 10;

async function fetchPlayers(search: string): Promise<Player[]> {
  const params = new URLSearchParams();
  params.set("withStats", "1");
  if (search.trim()) params.set("search", search.trim());
  const r = await fetch(`/api/players?${params}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

function sameEmail(a?: string | null, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function canEditPlayer(
  session: { user?: { playerId?: string; role?: string; email?: string | null } } | null,
  player: { _id: string; createdBy?: string; email?: string }
): boolean {
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  if (session.user.playerId === player._id) return true;
  if (sameEmail(session.user.email, player.email)) return true;
  if (player.createdBy && session.user.playerId && player.createdBy === session.user.playerId) return true;
  return false;
}

export default function PlayersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addError, setAddError] = useState("");

  const playersQuery = useQuery({
    queryKey: queryKeys.players(search),
    queryFn: () => fetchPlayers(search),
  });
  const players = playersQuery.data ?? [];
  const isLoading = playersQuery.isLoading;
  const isRefetching = playersQuery.isRefetching;
  const isError = playersQuery.isError;
  /** Show skeleton on initial load and when user clicks Refresh (same as Teams). */
  const showLoadingTable = isLoading || isRefetching;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AddPlayerFormData>({
    resolver: zodResolver(addPlayerSchema),
    defaultValues: { fullName: "", shortName: "", email: "", isKeeper: false },
  });

  async function removePlayer(id: string) {
    setRemoving(true);
    try {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRemoveId(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.players() });
        setCurrentPage((p) => Math.max(1, Math.min(p, Math.ceil((players.length - 1) / PAGE_SIZE))));
      }
    } finally {
      setRemoving(false);
    }
  }

  async function onAddPlayer(data: AddPlayerFormData) {
    setAddError("");
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setAddError(j.error?.message ?? "Failed to create player");
      return;
    }
    setShowAddDialog(false);
    reset({ fullName: "", shortName: "", email: "", isKeeper: false });
    queryClient.invalidateQueries({ queryKey: queryKeys.players() });
  }

  const totalPages = Math.max(1, Math.ceil(players.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedPlayers = players.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 active:bg-white/20 -ml-1 rounded-xl min-h-[44px] min-w-[44px]" asChild>
          <Link href="/">←</Link>
        </Button>
        <h1 className="text-lg sm:text-xl font-bold flex-1 text-center truncate">Players</h1>
        <div className="w-10 shrink-0" />
      </header>
      <main className="page-content-wide">
        <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-5">
          <div className="relative flex-1 min-w-0">
            <Input
              type="search"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 min-h-[44px] w-full rounded-xl text-base"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="default"
              className="h-11 min-h-[44px] flex-1 sm:flex-none rounded-xl px-4"
              onClick={() => playersQuery.refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              size="default"
              className="h-11 min-h-[44px] flex-1 sm:flex-none rounded-xl bg-cricket-green text-white hover:bg-cricket-green/90 border border-cricket-green shadow-md font-medium px-5"
              onClick={() => setShowAddDialog(true)}
            >
              Add
            </Button>
          </div>
        </div>
        {showLoadingTable ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2" aria-live="polite">
              <Spinner className="h-4 w-4 shrink-0 border-cricket-green border-t-transparent text-cricket-green" />
              {isRefetching ? "Refreshing players…" : "Loading players…"}
            </p>
            <TableSkeleton
              columns={["left", "left", "right", "right", "right", "right", "right"]}
              rows={5}
            />
          </div>
        ) : isError ? (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load players</p>
              <p className="text-sm text-muted-foreground mb-4">Check your connection and try again.</p>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => playersQuery.refetch()} disabled={isRefetching}>
                {isRefetching ? "Retrying…" : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : players.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-2">No players yet</p>
              <Button
                variant="link"
                className="text-primary p-0 h-auto min-h-0"
                onClick={() => setShowAddDialog(true)}
              >
                Add your first player →
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Full name</th>
                    <th className="text-left py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Short name</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Matches</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Runs</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">SR</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Wickets</th>
                    <th className="text-right py-3 sm:py-4 px-3 sm:px-4 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPlayers.map((p) => {
                    const stats = p.stats;
                    return (
                      <tr key={p._id} className="border-b border-border/80 hover:bg-muted/30 transition-colors">
                        <td className="py-3 sm:py-4 px-3 sm:px-4">
                          <Link href={`/players/${p._id}`} className="font-medium text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-cricket-green/30 rounded">
                            {p.fullName}
                          </Link>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-muted-foreground">{p.shortName ?? "—"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{stats ? stats.matchesPlayed : "—"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{stats ? stats.runs : "—"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{stats?.strikeRate != null ? stats.strikeRate : "—"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right tabular-nums">{stats ? stats.wickets : "—"}</td>
                        <td className="py-3 sm:py-4 px-3 sm:px-4 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {canEditPlayer(session, p) ? (
                              <>
                                <Button variant="ghost" size="sm" className="h-9 min-h-[36px] rounded-lg text-muted-foreground" asChild>
                                  <Link href={`/players/${p._id}/edit`}>Edit</Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 min-h-[36px] rounded-lg text-destructive hover:text-destructive"
                                  onClick={() => setRemoveId(p._id)}
                                >
                                  Remove
                                </Button>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 rounded-b-2xl safe-area-pb">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}–{startIndex + paginatedPlayers.length} of {players.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 min-h-[44px] rounded-xl px-3"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[2.25rem] h-10 rounded-xl"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 min-h-[44px] rounded-xl px-3"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </main>

      <Dialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove player</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this player? This cannot be undone. They will be removed from any teams.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)} disabled={removing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeId && removePlayer(removeId)}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) setAddError(""); reset({ fullName: "", shortName: "", email: "", isKeeper: false }); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add player</DialogTitle>
            <DialogDescription>Add a new player to your squad.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddPlayer)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-fullName">Full name *</Label>
              <Input
                id="add-fullName"
                {...register("fullName")}
                placeholder="e.g. John Smith"
                className="h-11"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-shortName">Short name</Label>
              <Input
                id="add-shortName"
                {...register("shortName")}
                placeholder="e.g. J. Smith"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email (optional)</Label>
              <Input
                id="add-email"
                type="email"
                {...register("email")}
                placeholder="e.g. john@example.com"
                className="h-11"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Controller
              name="isKeeper"
              control={control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="add-keeper"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="add-keeper" className="cursor-pointer font-normal">Wicket keeper</Label>
                </div>
              )}
            />
            {addError && (
              <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{addError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cricket-green text-white hover:bg-cricket-green/90">
                Create Player
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
