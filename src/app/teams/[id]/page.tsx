"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";

interface Player {
  _id: string;
  fullName: string;
  shortName?: string;
}
interface Team {
  _id: string;
  teamName: string;
  playerIds: string[];
}

const schema = z.object({
  teamName: z.string().min(1),
  playerIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

export default function EditTeamPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<{ matchCount: number; winCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { teamName: "", playerIds: [] },
  });
  const playerIds = watch("playerIds") ?? [];

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/players?light=1").then((r) => r.json()),
      fetch(`/api/teams/${id}/stats`).then((r) => (r.ok ? r.json() : null)),
    ]).then(([t, p, s]) => {
      if (t) setTeam(t);
      if (Array.isArray(p)) setPlayers(p);
      if (s && typeof s.matchCount === "number") setStats(s);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (team) {
      setValue("teamName", team.teamName);
      setValue("playerIds", team.playerIds ?? []);
    }
  }, [team, setValue]);

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

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch(`/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError("Failed to update");
      return;
    }
    router.push("/teams");
  }

  if (loading || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-5 w-5 border-cricket-green border-t-transparent text-cricket-green" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const playersInTeam = playerIds.map((pid) => players.find((p) => p._id === pid)).filter(Boolean) as Player[];
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

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href="/teams">←</Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">Edit Team</h1>
        <div className="w-10" />
      </header>
      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-5 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team name *</Label>
                <Input id="teamName" {...register("teamName")} className="h-11" />
              </div>
              {stats && (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span><strong className="text-foreground">Matches:</strong> {stats.matchCount}</span>
                  <span><strong className="text-foreground">Wins:</strong> {stats.winCount}</span>
                </div>
              )}
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
                            <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => removePlayer(p._id)}>
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {playersInTeam.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-4 px-3 text-center text-muted-foreground">No players yet. Type above to add.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full h-11">Save</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
