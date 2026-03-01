"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Player {
  _id: string;
  fullName: string;
  shortName?: string;
  email?: string;
  isKeeper?: boolean;
}

interface BattingStats {
  runs: number;
  balls: number;
  innings: number;
  dismissals: number;
  average: number | null;
  strikeRate: number | null;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
}

interface BowlingStats {
  wickets: number;
  runsConceded: number;
  balls: number;
  economy: number | null;
  average: number | null;
}

interface StatsResponse {
  matchesPlayed: number;
  batting: BattingStats;
  bowling: BowlingStats;
  runsPerInnings: number[];
}

export default function PlayerStatsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/players/${id}`).then((r) => {
        if (r.status === 404) return null;
        return r.json();
      }),
      fetch(`/api/players/${id}/stats`).then((r) => r.json()),
    ])
      .then(([playerData, statsData]) => {
        if (!playerData) {
          setLoading(false);
          router.replace("/players");
          return;
        }
        setPlayer(playerData);
        setStats(statsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  if (loading || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-5 w-5 border-cricket-green border-t-transparent text-cricket-green" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  const batting = stats?.batting ?? null;
  const bowling = stats?.bowling ?? null;
  const matchesPlayed = stats?.matchesPlayed ?? 0;
  const runsPerInnings = stats?.runsPerInnings ?? [];

  const chartData = runsPerInnings.map((runs, i) => ({
    name: `Inn ${i + 1}`,
    runs,
  }));
  const hasBatting = batting && (batting.innings > 0 || batting.runs > 0);
  const hasBowling = bowling && (bowling.balls > 0 || bowling.wickets > 0);

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href="/players">←</Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center truncate px-2">
          {player.fullName}
        </h1>
        <Button size="sm" className="bg-white text-primary hover:bg-white/90 shrink-0" asChild>
          <Link href={`/players/${id}/edit`}>Edit</Link>
        </Button>
      </header>
      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Matches played</span> {matchesPlayed}</p>
            {player.shortName && (
              <p><span className="font-medium text-foreground">Short name</span> {player.shortName}</p>
            )}
            {player.isKeeper && (
              <p className="text-primary font-medium">Wicket keeper</p>
            )}
          </CardContent>
        </Card>

        {hasBatting && batting && (
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Batting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Runs</span> <span className="font-semibold">{batting.runs}</span></div>
                <div><span className="text-muted-foreground">Innings</span> <span className="font-semibold">{batting.innings}</span></div>
                <div><span className="text-muted-foreground">Average</span> <span className="font-semibold">{batting.average ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Strike rate</span> <span className="font-semibold">{batting.strikeRate ?? "—"}</span></div>
                <div><span className="text-muted-foreground">4s</span> <span className="font-semibold">{batting.fours}</span></div>
                <div><span className="text-muted-foreground">6s</span> <span className="font-semibold">{batting.sixes}</span></div>
                <div><span className="text-muted-foreground">50s</span> <span className="font-semibold">{batting.fifties}</span></div>
                <div><span className="text-muted-foreground">100s</span> <span className="font-semibold">{batting.hundreds}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasBowling && bowling && (
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bowling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Wickets</span> <span className="font-semibold">{bowling.wickets}</span></div>
                <div><span className="text-muted-foreground">Runs conceded</span> <span className="font-semibold">{bowling.runsConceded}</span></div>
                <div><span className="text-muted-foreground">Economy</span> <span className="font-semibold">{bowling.economy ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Average</span> <span className="font-semibold">{bowling.average ?? "—"}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {chartData.length > 0 && (
          <Card className="border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Runs per innings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value: number | undefined) => [value ?? 0, "Runs"]}
                      labelFormatter={(label) => label}
                    />
                    <Bar dataKey="runs" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={index} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasBatting && !hasBowling && matchesPlayed === 0 && (
          <Card className="border-0 shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No match stats yet. Stats will appear once this player has played in matches.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
