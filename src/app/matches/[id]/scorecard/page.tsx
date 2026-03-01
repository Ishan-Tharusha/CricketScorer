"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  computeInningsSummary,
  computeBattingCard,
  computeBowlingFigures,
  formatOvers,
} from "@/lib/engine";
import type { Match, BallEvent, RulesConfig } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";

interface Player {
  _id: string;
  fullName: string;
}

interface Team {
  _id: string;
  teamName: string;
}

export default function ScorecardPage() {
  const [match, setMatch] = useState<Match | null>(null);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = typeof window !== "undefined" ? window.location.pathname.split("/")[2] : "";
    if (!id) return;
    Promise.all([
      fetch(`/api/matches/${id}`).then((r) => r.json()),
      fetch("/api/players?light=1").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ]).then(([m, players, teams]: [Match, Player[], Team[]]) => {
      if (m._id) setMatch(m);
      if (Array.isArray(players)) {
        const map: Record<string, string> = {};
        players.forEach((p) => { map[p._id] = p.fullName; });
        setPlayersMap(map);
      }
      if (Array.isArray(teams)) {
        const map: Record<string, string> = {};
        teams.forEach((t) => { map[t._id] = t.teamName; });
        setTeamsMap(map);
      }
      setLoading(false);
    });
  }, []);

  if (loading || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-5 w-5 border-cricket-green border-t-transparent text-cricket-green" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const rules: RulesConfig = match.rulesConfig ?? { oversPerInnings: 20, ballsPerOver: 6, wideRuns: 1, noBallRuns: 1, wideCountsAsBall: false, noBallCountsAsBall: false };
  const teamAName = teamsMap[match.teamAId] ?? "Team A";
  const teamBName = teamsMap[match.teamBId] ?? "Team B";
  const getTeamName = (teamId: string) => (match.teamAId === teamId ? teamAName : teamBName);

  /** Compute match result (who won or tie) for completed matches. */
  function getMatchResult(): string | null {
    if (!match || match.status !== "COMPLETED") return null;
    const inns = match.innings ?? [];
    if (inns.length < 2) return null;
    const isSO = inns.length >= 4 && (inns[inns.length - 1]?.maxOvers === 1);
    const first = isSO ? inns[inns.length - 2]! : inns[0]!;
    const second = isSO ? inns[inns.length - 1]! : inns[1]!;
    const bpo1 = first.ballsPerOver ?? rules.ballsPerOver;
    const bpo2 = second.ballsPerOver ?? rules.ballsPerOver;
    const r1 = computeInningsSummary(first.events ?? [], rules, bpo1).totalRuns;
    const w1 = computeInningsSummary(first.events ?? [], rules, bpo1).wickets;
    const r2 = computeInningsSummary(second.events ?? [], rules, bpo2).totalRuns;
    const w2 = computeInningsSummary(second.events ?? [], rules, bpo2).wickets;
    const team1Bat = first.battingTeamId;
    const team2Bat = second.battingTeamId;
    const team1Name = match.teamAId === team1Bat ? teamAName : teamBName;
    const team2Name = match.teamAId === team2Bat ? teamAName : teamBName;
    const maxWk = (match.playingXI_A?.length ?? 11) - 1;
    if (r2 > r1) return `${team2Name} won by ${maxWk - w2} wicket${maxWk - w2 !== 1 ? "s" : ""}`;
    if (r2 < r1) return `${team1Name} won by ${r1 - r2} run${r1 - r2 !== 1 ? "s" : ""}`;
    return "Match tied";
  }

  const resultMessage = getMatchResult();

  return (
    <div className="min-h-screen pb-8">
      <header className="bg-cricket-green text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href={match.status === "IN_PROGRESS" ? `/matches/${match._id}/score` : "/matches"} className="text-white">←</Link>
        <h1 className="text-lg font-bold truncate flex-1 text-center mx-2">{match.matchName}</h1>
        {match.status === "IN_PROGRESS" && (
          <Link href={`/matches/${match._id}/score`} className="text-white text-sm">Score</Link>
        )}
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {resultMessage && (
          <div className="rounded-xl bg-cricket-green text-white p-4 text-center shadow-md">
            <p className="text-xs font-medium uppercase tracking-wider opacity-90">Result</p>
            <p className="text-xl font-bold mt-1">{resultMessage}</p>
          </div>
        )}
        <p className="text-gray-600 text-sm">
          {new Date(match.date).toLocaleDateString()} · {match.status}
        </p>

        {(match.innings ?? []).map((innings, idx) => {
          const events: BallEvent[] = innings.events ?? [];
          const bpo = innings.ballsPerOver ?? rules.ballsPerOver;
          const summary = computeInningsSummary(events, rules, bpo);
          const defaultBatOrder = match.teamAId === innings.battingTeamId ? (match.playingXI_A ?? []) : (match.playingXI_B ?? []);
          const batOrder = (innings.battingOrderOverride?.length ? innings.battingOrderOverride : defaultBatOrder) as string[];
          const bowlOrder = match.teamAId === innings.bowlingTeamId ? (match.playingXI_A ?? []) : (match.playingXI_B ?? []);
          const battingCard = computeBattingCard(events, batOrder);
          const bowlingFigs = computeBowlingFigures(events, rules, bowlOrder, bpo);

          return (
            <div key={idx} className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold text-cricket-green mb-1">
                Innings {idx + 1}{innings.maxOvers === 1 ? " (Super Over)" : ""}: {summary.totalRuns}/{summary.wickets} ({formatOvers(summary, bpo)} overs)
              </h2>
              <p className="text-sm text-gray-700 font-medium mb-1">
                Batting: {getTeamName(innings.battingTeamId)} · Bowling: {getTeamName(innings.bowlingTeamId)}
              </p>
              <p className="text-sm text-gray-600 mb-3">Run rate: {summary.runRate}</p>
              {Object.keys(summary.extrasBreakdown).length > 0 && (
                <p className="text-sm text-gray-600 mb-2">
                  Extras: {Object.entries(summary.extrasBreakdown).map(([k, v]) => `${k} ${v}`).join(", ")}
                </p>
              )}

              <h3 className="font-medium mt-3 mb-1">Batting – {getTeamName(innings.battingTeamId)}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Batter</th>
                      <th className="text-right py-1">R</th>
                      <th className="text-right py-1">B</th>
                      <th className="text-right py-1">4s</th>
                      <th className="text-right py-1">6s</th>
                      <th className="text-right py-1">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battingCard.map((b) => (
                      <tr key={b.playerId} className="border-b border-gray-100">
                        <td className="py-1">
                          {playersMap[b.playerId] ?? b.playerId}
                          {b.dismissalText && <span className="text-gray-500 text-xs block">{b.dismissalText}</span>}
                        </td>
                        <td className="text-right py-1">{b.runs}{!b.out && b.balls > 0 ? "*" : ""}</td>
                        <td className="text-right py-1">{b.balls}</td>
                        <td className="text-right py-1">{b.fours}</td>
                        <td className="text-right py-1">{b.sixes}</td>
                        <td className="text-right py-1">{b.strikeRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="font-medium mt-3 mb-1">Bowling – {getTeamName(innings.bowlingTeamId)}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Bowler</th>
                      <th className="text-right py-1">O</th>
                      <th className="text-right py-1">R</th>
                      <th className="text-right py-1">W</th>
                      <th className="text-right py-1">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlingFigs.filter((f) => f.overs > 0 || f.balls > 0).map((f) => (
                      <tr key={f.playerId} className="border-b border-gray-100">
                        <td className="py-1">{playersMap[f.playerId] ?? f.playerId}</td>
                        <td className="text-right py-1">{f.overs}.{f.balls}</td>
                        <td className="text-right py-1">{f.runsConceded}</td>
                        <td className="text-right py-1">{f.wickets}</td>
                        <td className="text-right py-1">{f.economy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
