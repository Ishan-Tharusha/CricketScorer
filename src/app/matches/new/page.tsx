"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Team } from "@/lib/types";
import { DEFAULT_RULES } from "@/lib/types";
import { computeInningsSummary } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Spinner } from "@/components/ui/spinner";

type Step = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  teamAId: string;
  teamBId: string;
  teamA: Team | null;
  teamB: Team | null;
  playingXI_A: string[];
  playingXI_B: string[];
  rules: typeof DEFAULT_RULES;
  tossWinnerTeamId: string;
  tossDecision: "BAT" | "FIELD" | "";
  matchName: string;
  date: string;
}

interface Player {
  _id: string;
  fullName: string;
}

function NewMatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const rematchId = searchParams.get("rematch");
  const [teams, setTeams] = useState<Team[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [rematchLoaded, setRematchLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<WizardState>({
    teamAId: "",
    teamBId: "",
    teamA: null,
    teamB: null,
    playingXI_A: [],
    playingXI_B: [],
    rules: { ...DEFAULT_RULES },
    tossWinnerTeamId: "",
    tossDecision: "",
    matchName: "",
    date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    let teamsDone = false;
    let playersDone = false;
    const checkBoth = () => {
      if (teamsDone && playersDone) setDataLoaded(true);
    };
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => { Array.isArray(d) && setTeams(d); teamsDone = true; checkBoth(); });
    fetch("/api/players?light=1")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          const map: Record<string, string> = {};
          (d as Player[]).forEach((p) => { map[p._id] = p.fullName; });
          setPlayersMap(map);
        }
        playersDone = true;
        checkBoth();
      });
  }, []);

  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const playerId = (session?.user as { playerId?: string } | undefined)?.playerId;

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams();
    params.set("forUser", userId);
    if (playerId) params.set("forPlayer", playerId);
    params.set("limit", "1");
    params.set("page", "1");
    fetch(`/api/matches?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const total = typeof data?.total === "number" ? data.total : 0;
        setState((s) => ({ ...s, matchName: s.matchName || `match-${total + 1}` }));
      })
      .catch(() => {});
  }, [userId, playerId]);

  useEffect(() => {
    if (!rematchId || rematchLoaded || teams.length === 0) return;
    fetch(`/api/matches/${rematchId}`)
      .then((r) => r.json())
      .then((m) => {
        if (!m._id) return;
        const rules = m.rulesConfig ? { ...DEFAULT_RULES, ...m.rulesConfig } : { ...DEFAULT_RULES };
        const inn0 = m.innings?.[0];
        const inn1 = m.innings?.[1];
        let tossWinnerTeamId = "";
        let tossDecision: "BAT" | "FIELD" | "" = "";
        if (inn0 && inn1) {
          const bpo0 = inn0.ballsPerOver ?? rules.ballsPerOver;
          const bpo1 = inn1.ballsPerOver ?? rules.ballsPerOver;
          const sum0 = computeInningsSummary(inn0.events ?? [], rules, bpo0);
          const sum1 = computeInningsSummary(inn1.events ?? [], rules, bpo1);
          if (sum1.totalRuns > sum0.totalRuns) {
            tossWinnerTeamId = inn1.battingTeamId;
            tossDecision = "BAT";
          } else if (sum0.totalRuns > sum1.totalRuns) {
            tossWinnerTeamId = inn0.battingTeamId;
            tossDecision = "BAT";
          }
        }
        const currentName = m.matchName ?? "Match";
        const rematchNum = /^match-(\d+)$/i.exec(currentName);
        const nextMatchName = rematchNum ? `match-${Number(rematchNum[1]) + 1}` : `${currentName} (rematch)`;
        setState({
          teamAId: m.teamAId ?? "",
          teamBId: m.teamBId ?? "",
          teamA: teams.find((x) => x._id === m.teamAId) ?? null,
          teamB: teams.find((x) => x._id === m.teamBId) ?? null,
          playingXI_A: Array.isArray(m.playingXI_A) ? m.playingXI_A : [],
          playingXI_B: Array.isArray(m.playingXI_B) ? m.playingXI_B : [],
          rules,
          tossWinnerTeamId,
          tossDecision,
          matchName: nextMatchName,
          date: new Date().toISOString().slice(0, 10),
        });
        setStep(4);
        setRematchLoaded(true);
      })
      .catch(() => setRematchLoaded(true));
  }, [rematchId, rematchLoaded, teams]);

  useEffect(() => {
    const t = teams.find((x) => x._id === state.teamAId);
    setState((s) => ({ ...s, teamA: t ?? null, playingXI_A: t ? (s.playingXI_A.filter((id) => (t.playerIds ?? []).includes(id))) : [] }));
  }, [state.teamAId, teams]);

  useEffect(() => {
    const t = teams.find((x) => x._id === state.teamBId);
    setState((s) => ({ ...s, teamB: t ?? null, playingXI_B: t ? (s.playingXI_B.filter((id) => (t.playerIds ?? []).includes(id))) : [] }));
  }, [state.teamBId, teams]);

  function togglePlayingXI(team: "A" | "B", playerId: string) {
    const key = team === "A" ? "playingXI_A" : "playingXI_B";
    const list = state[key];
    const next = list.includes(playerId)
      ? list.filter((id) => id !== playerId)
      : list.length < 11
        ? [...list, playerId]
        : list;
    setState((s) => ({ ...s, [key]: next }));
  }

  async function createAndStart() {
    setError("");
    setLoading(true);
    const battingTeamId = state.tossDecision === "BAT" ? state.tossWinnerTeamId : (state.tossWinnerTeamId === state.teamAId ? state.teamBId : state.teamAId);
    const bowlingTeamId = state.tossWinnerTeamId === state.teamAId ? state.teamBId : state.teamAId;
    const payload = {
      matchName: state.matchName || "Match",
      date: state.date,
      teamAId: state.teamAId,
      teamBId: state.teamBId,
      playingXI_A: state.playingXI_A,
      playingXI_B: state.playingXI_B,
      tossWinnerTeamId: state.tossWinnerTeamId,
      tossDecision: state.tossDecision,
      rulesConfig: state.rules,
      status: "IN_PROGRESS",
      innings: [
        { battingTeamId, bowlingTeamId, events: [] },
      ],
      ...(session?.user?.id && { createdByUserId: session.user.id }),
    };
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error?.message ?? "Failed to create match");
        setLoading(false);
        return;
      }
      const match = await res.json();
      queryClient.invalidateQueries({ queryKey: queryKeys.matches() });
      router.push(`/matches/${match._id}/score`);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  const teamA = state.teamA;
  const teamB = state.teamB;
  const canNext =
    (step === 1 && state.teamAId && state.teamBId && state.teamAId !== state.teamBId) ||
    (step === 2 && state.playingXI_A.length >= 1 && state.playingXI_B.length >= 1) ||
    (step === 3 && true) ||
    (step === 4 && state.tossWinnerTeamId && state.tossDecision) ||
    step === 5;

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href="/matches">←</Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">New Match — Step {step}/5</h1>
        <div className="w-10" />
      </header>
      <main className="p-4 max-w-lg mx-auto space-y-4">
        <Card>
          <CardContent className="p-5 pt-6 space-y-4">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label htmlFor="matchName">Match name</Label>
              <Input
                id="matchName"
                value={state.matchName}
                onChange={(e) => setState((s) => ({ ...s, matchName: e.target.value }))}
                placeholder={dataLoaded ? "e.g. Finals" : "Loading…"}
                className="h-11"
                disabled={!dataLoaded}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={state.date}
                onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
                className="h-11"
                disabled={!dataLoaded}
              />
            </div>
            <div className="space-y-2">
              <Label>Team A</Label>
              <Select value={state.teamAId || "_"} onValueChange={(v) => setState((s) => ({ ...s, teamAId: v === "_" ? "" : v }))}>
                <SelectTrigger className="h-11 rounded-xl" disabled={!dataLoaded}>
                  <SelectValue placeholder={dataLoaded ? "Select team" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">{dataLoaded ? "Select team" : "Loading…"}</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.teamName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Team B</Label>
              <Select value={state.teamBId || "_"} onValueChange={(v) => setState((s) => ({ ...s, teamBId: v === "_" ? "" : v }))}>
                <SelectTrigger className="h-11 rounded-xl" disabled={!dataLoaded}>
                  <SelectValue placeholder={dataLoaded ? "Select team" : "Loading…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">{dataLoaded ? "Select team" : "Loading…"}</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.teamName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Playing XI — {teamA?.teamName ?? (dataLoaded ? "—" : "Loading…")}</Label>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border border-input bg-muted/30 p-2">
                {!dataLoaded ? (
                  <li className="py-3 px-3 text-sm text-muted-foreground">Loading…</li>
                ) : (teamA?.playerIds ?? []).map((pid) => (
                  <li key={pid}>
                    <label className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-background cursor-pointer">
                      <Checkbox
                        checked={state.playingXI_A.includes(pid)}
                        onCheckedChange={() => togglePlayingXI("A", pid)}
                        disabled={!state.playingXI_A.includes(pid) && state.playingXI_A.length >= 11}
                      />
                      <span className="text-sm font-medium">{playersMap[pid] ?? pid}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{state.playingXI_A.length} selected</p>
            </div>
            <div className="space-y-2">
              <Label>Playing XI — {teamB?.teamName ?? (dataLoaded ? "—" : "Loading…")}</Label>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border border-input bg-muted/30 p-2">
                {!dataLoaded ? (
                  <li className="py-3 px-3 text-sm text-muted-foreground">Loading…</li>
                ) : (teamB?.playerIds ?? []).map((pid) => (
                  <li key={pid}>
                    <label className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-background cursor-pointer">
                      <Checkbox
                        checked={state.playingXI_B.includes(pid)}
                        onCheckedChange={() => togglePlayingXI("B", pid)}
                        disabled={!state.playingXI_B.includes(pid) && state.playingXI_B.length >= 11}
                      />
                      <span className="text-sm font-medium">{playersMap[pid] ?? pid}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{state.playingXI_B.length} selected</p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-2">
              <Label>Overs per innings</Label>
              <div className="flex flex-wrap gap-2">
                {([5, 10, 20] as const).map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={state.rules.oversPerInnings === n ? "default" : "outline"}
                    size="sm"
                    className="h-9 rounded-xl"
                    onClick={() => setState((s) => ({ ...s, rules: { ...s.rules, oversPerInnings: n } }))}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={[5, 10, 20].includes(state.rules.oversPerInnings) ? "outline" : "default"}
                  size="sm"
                  className="h-9 rounded-xl"
                  onClick={() => setState((s) => ({
                    ...s,
                    rules: {
                      ...s.rules,
                      oversPerInnings: [5, 10, 20].includes(s.rules.oversPerInnings) ? 15 : s.rules.oversPerInnings,
                    },
                  }))}
                >
                  Custom
                </Button>
              </div>
              {![5, 10, 20].includes(state.rules.oversPerInnings) && (
                <Input
                  type="number"
                  min={1}
                  value={state.rules.oversPerInnings}
                  onChange={(e) => setState((s) => ({ ...s, rules: { ...s.rules, oversPerInnings: Math.max(1, +e.target.value || 1) } }))}
                  className="h-9 w-24 rounded-xl"
                  placeholder="Enter"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Balls per over</Label>
              <div className="flex flex-wrap gap-2">
                {([4, 5, 6, 8] as const).map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={state.rules.ballsPerOver === n ? "default" : "outline"}
                    size="sm"
                    className="h-9 rounded-xl"
                    onClick={() => setState((s) => ({ ...s, rules: { ...s.rules, ballsPerOver: n } }))}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wideRuns">Wide runs (default 1)</Label>
              <Input
                id="wideRuns"
                type="number"
                min={0}
                value={state.rules.wideRuns}
                onChange={(e) => setState((s) => ({ ...s, rules: { ...s.rules, wideRuns: +e.target.value || 1 } }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noBallRuns">No-ball runs (default 1)</Label>
              <Input
                id="noBallRuns"
                type="number"
                min={0}
                value={state.rules.noBallRuns}
                onChange={(e) => setState((s) => ({ ...s, rules: { ...s.rules, noBallRuns: +e.target.value || 1 } }))}
                className="h-11"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="wideCounts"
                checked={state.rules.wideCountsAsBall}
                onCheckedChange={(checked) => setState((s) => ({ ...s, rules: { ...s.rules, wideCountsAsBall: !!checked } }))}
              />
              <Label htmlFor="wideCounts" className="cursor-pointer font-normal text-sm">Wide counts as ball</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="nbCounts"
                checked={state.rules.noBallCountsAsBall}
                onCheckedChange={(checked) => setState((s) => ({ ...s, rules: { ...s.rules, noBallCountsAsBall: !!checked } }))}
              />
              <Label htmlFor="nbCounts" className="cursor-pointer font-normal text-sm">No-ball counts as ball</Label>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="space-y-2">
              <Label>Toss winner</Label>
              <div className="flex flex-wrap gap-2">
                {teamA && (
                  <Button
                    type="button"
                    variant={state.tossWinnerTeamId === state.teamAId ? "default" : "outline"}
                    size="sm"
                    className="h-10 rounded-xl flex-1 min-w-0"
                    onClick={() => setState((s) => ({ ...s, tossWinnerTeamId: state.teamAId }))}
                  >
                    {teamA.teamName}
                  </Button>
                )}
                {teamB && (
                  <Button
                    type="button"
                    variant={state.tossWinnerTeamId === state.teamBId ? "default" : "outline"}
                    size="sm"
                    className="h-10 rounded-xl flex-1 min-w-0"
                    onClick={() => setState((s) => ({ ...s, tossWinnerTeamId: state.teamBId }))}
                  >
                    {teamB.teamName}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Decision</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={state.tossDecision === "BAT" ? "default" : "outline"}
                  size="sm"
                  className="h-10 rounded-xl flex-1"
                  onClick={() => setState((s) => ({ ...s, tossDecision: "BAT" as const }))}
                >
                  Bat
                </Button>
                <Button
                  type="button"
                  variant={state.tossDecision === "FIELD" ? "default" : "outline"}
                  size="sm"
                  className="h-10 rounded-xl flex-1"
                  onClick={() => setState((s) => ({ ...s, tossDecision: "FIELD" as const }))}
                >
                  Field
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <p className="font-semibold text-foreground">Summary</p>
            <p className="text-sm text-muted-foreground">{state.matchName || "Match"} — {state.date}</p>
            <p className="text-sm">{teamA?.teamName} vs {teamB?.teamName}</p>
            <p className="text-sm">{state.rules.oversPerInnings} overs, {state.rules.ballsPerOver} balls/over</p>
            <p className="text-sm">Toss: {state.tossWinnerTeamId === state.teamAId ? teamA?.teamName : teamB?.teamName} chose to {state.tossDecision === "BAT" ? "bat" : "field"}</p>
            <p className="text-xs text-muted-foreground">Batting first: {state.tossDecision === "BAT" ? (state.tossWinnerTeamId === state.teamAId ? teamA?.teamName : teamB?.teamName) : (state.tossWinnerTeamId === state.teamAId ? teamB?.teamName : teamA?.teamName)}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button
              type="button"
              className="flex-1 h-11 rounded-xl"
              onClick={() => canNext && setStep((s) => (s + 1) as Step)}
              disabled={!canNext}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 h-11 rounded-xl"
              onClick={createAndStart}
              disabled={loading}
            >
              {loading ? "Starting…" : "Start Match"}
            </Button>
          )}
        </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function NewMatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-5 w-5 border-cricket-green border-t-transparent text-cricket-green" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    }>
      <NewMatchContent />
    </Suspense>
  );
}
