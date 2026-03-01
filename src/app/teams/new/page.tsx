"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  _id: string;
  fullName: string;
  shortName?: string;
}

const schema = z.object({
  teamName: z.string().min(1, "Team name required"),
  playerIds: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

export default function NewTeamPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState("");
  const [addPlayerId, setAddPlayerId] = useState("");
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { teamName: "", playerIds: [] },
  });
  const playerIds = watch("playerIds") ?? [];

  useEffect(() => {
    fetch("/api/players?light=1").then((r) => r.json()).then((d) => Array.isArray(d) && setPlayers(d));
  }, []);

  function addPlayer(pid: string) {
    if (!pid || playerIds.includes(pid)) return;
    setValue("playerIds", [...playerIds, pid]);
    setAddPlayerId("");
  }

  function removePlayer(pid: string) {
    setValue(
      "playerIds",
      playerIds.filter((x) => x !== pid)
    );
  }

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError("Failed to create team");
      return;
    }
    router.push("/teams");
  }

  const playersInTeam = playerIds.map((pid) => players.find((p) => p._id === pid)).filter(Boolean) as Player[];
  const availableToAdd = players.filter((p) => !playerIds.includes(p._id));

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href="/teams">←</Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">New Team</h1>
        <div className="w-10" />
      </header>
      <main className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-5 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team name *</Label>
                <Input
                  id="teamName"
                  {...register("teamName")}
                  placeholder="e.g. Tigers XI"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Players</Label>
                <div className="flex gap-2">
                  <Select value={addPlayerId || "_"} onValueChange={(v) => v !== "_" && addPlayer(v)}>
                    <SelectTrigger className="h-10 rounded-xl flex-1">
                      <SelectValue placeholder="Add player" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Add player…</SelectItem>
                      {availableToAdd.map((p) => (
                        <SelectItem key={p._id} value={p._id}>{p.fullName}</SelectItem>
                      ))}
                      {availableToAdd.length === 0 && (
                        <SelectItem value="_" disabled>All players added</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
                          <td colSpan={2} className="py-4 px-3 text-center text-muted-foreground">No players yet. Add from dropdown above.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full h-11">Create Team</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
