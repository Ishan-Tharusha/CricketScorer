"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  computeInningsSummary,
  formatOvers,
  getCurrentBattersSimple,
  shouldEndInnings,
  ballCounts,
  computeBattingCard,
  computeBowlingFigures,
} from "@/lib/engine";
import type { Match, BallEvent, RulesConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
}

interface Team {
  _id: string;
  teamName: string;
  playerIds?: string[];
}

export default function ScorePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({});
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editOversPerInnings, setEditOversPerInnings] = useState(20);
  const [editBallsPerOver, setEditBallsPerOver] = useState(6);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentBowlerId, setCurrentBowlerId] = useState<string>("");
  const [showWicket, setShowWicket] = useState(false);
  const [showNextBowler, setShowNextBowler] = useState(false);
  const [showInningsOver, setShowInningsOver] = useState(false);
  const [showByesRuns, setShowByesRuns] = useState<"B" | "LB" | null>(null);
  const [wicketKind, setWicketKind] = useState<"BOWLED" | "CAUGHT" | "LBW" | "RUN_OUT" | "STUMPED" | "HIT_WICKET" | "RETIRED">("BOWLED");
  const [wicketBatterId, setWicketBatterId] = useState("");
  const [wicketStep, setWicketStep] = useState<1 | 2>(1);
  const [newBatterId, setNewBatterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"score" | "batting" | "bowling">("score");
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSuperOverConfig, setShowSuperOverConfig] = useState(false);
  const [superOverBallsPerOver, setSuperOverBallsPerOver] = useState(6);
  /** Super Over: selection before scoring (who bats, who bowls) */
  const [soStrikerId, setSoStrikerId] = useState("");
  const [soNonStrikerId, setSoNonStrikerId] = useState("");
  const [soBowlerId, setSoBowlerId] = useState("");
  /** Normal innings: opening batting pair (striker & non-striker) before scoring */
  const [openingStrikerId, setOpeningStrikerId] = useState("");
  const [openingNonStrikerId, setOpeningNonStrikerId] = useState("");

  const loadMatch = useCallback(async (id: string) => {
    const [mRes, pRes, tRes] = await Promise.all([
      fetch(`/api/matches/${id}`),
      fetch("/api/players?light=1"),
      fetch("/api/teams"),
    ]);
    const m = await mRes.json();
    const players: Player[] = await pRes.json();
    const teams: Team[] = await tRes.json();
    if (m._id) {
      setMatch(m);
      const inn = m.innings?.[m.innings.length - 1];
      const bowl = m.teamAId === (inn?.bowlingTeamId) ? (m.playingXI_A ?? []) : (m.playingXI_B ?? []);
      if (inn?.initialBowlerId) setCurrentBowlerId(inn.initialBowlerId);
      else if (bowl[0]) setCurrentBowlerId((prev) => prev || bowl[0]);
    }
    if (Array.isArray(players)) {
      const map: Record<string, string> = {};
      players.forEach((p) => { map[p._id] = p.fullName; });
      setPlayersMap(map);
    }
    if (Array.isArray(teams)) {
      const map: Record<string, string> = {};
      teams.forEach((t) => { map[t._id] = t.teamName; });
      setTeamsMap(map);
      setTeamsList(teams);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = typeof window !== "undefined" ? window.location.pathname.split("/")[2] : "";
    if (id) {
      setMatchId(id);
      loadMatch(id);
    }
  }, [loadMatch]);

  const currentInnings = match?.innings?.length ? match.innings[match.innings.length - 1] : null;
  const events: BallEvent[] = currentInnings?.events ?? [];
  const rules: RulesConfig = match?.rulesConfig ?? { oversPerInnings: 20, ballsPerOver: 6, wideRuns: 1, noBallRuns: 1, wideCountsAsBall: false, noBallCountsAsBall: false };
  const battingTeamId = currentInnings?.battingTeamId ?? "";
  const bowlingTeamId = currentInnings?.bowlingTeamId ?? "";
  const defaultBattingOrder = (match?.teamAId === battingTeamId ? match?.playingXI_A : match?.playingXI_B) ?? [];
  const battingOrder = (currentInnings?.battingOrderOverride?.length ? currentInnings.battingOrderOverride : defaultBattingOrder) as string[];
  const bowlingOrder = (match?.teamAId === bowlingTeamId ? match?.playingXI_A : match?.playingXI_B) ?? [];

  const effectiveBallsPerOver = currentInnings?.ballsPerOver ?? rules.ballsPerOver;
  const summary = currentInnings ? computeInningsSummary(events, rules, effectiveBallsPerOver) : null;
  const battingCard = currentInnings ? computeBattingCard(events, battingOrder) : [];
  const bowlingFigures = currentInnings ? computeBowlingFigures(events, rules, bowlingOrder, effectiveBallsPerOver).filter((f) => f.overs > 0 || f.balls > 0) : [];
  const { strikerId, nonStrikerId } = currentInnings
    ? getCurrentBattersSimple(events, battingOrder, { ...rules, ballsPerOver: effectiveBallsPerOver })
    : { strikerId: "", nonStrikerId: "" };

  const totalBallsBowled = summary?.totalBallsBowled ?? 0;
  const overJustFinished = totalBallsBowled > 0 && totalBallsBowled % effectiveBallsPerOver === 0;
  /** After at least one over is complete, do not allow changing balls per over (only total overs per innings). */
  const oneOverComplete = totalBallsBowled >= effectiveBallsPerOver;
  /** Can only change bowler when 0 balls bowled in current over (start or after over complete). */
  const canChangeBowler = totalBallsBowled % effectiveBallsPerOver === 0;

  useEffect(() => {
    if (overJustFinished) setShowNextBowler(true);
  }, [overJustFinished]);

  const inningsIndex = (match?.innings?.length ?? 1) - 1;
  const maxOversForInnings = currentInnings?.maxOvers ?? rules.oversPerInnings;
  const isSuperOver = (currentInnings?.maxOvers ?? 0) > 0 && maxOversForInnings < rules.oversPerInnings;
  const isSecondInnings = (match?.innings?.length ?? 0) >= 2;
  const isChasingInnings = inningsIndex % 2 === 1;
  const prevInnings = inningsIndex > 0 ? match?.innings?.[inningsIndex - 1] : null;
  const prevBpo = prevInnings?.ballsPerOver ?? rules.ballsPerOver;
  const firstInningsRuns = prevInnings ? computeInningsSummary(prevInnings.events ?? [], rules, prevBpo).totalRuns : 0;
  const target = firstInningsRuns + 1;
  const currentRuns = summary?.totalRuns ?? 0;
  const maxBalls = maxOversForInnings * effectiveBallsPerOver;
  const ballsLeft = Math.max(0, maxBalls - totalBallsBowled);
  const runsNeeded = Math.max(0, target - currentRuns);
  const requiredRR = ballsLeft > 0 ? (runsNeeded / (ballsLeft / effectiveBallsPerOver)) : 0;

  const shouldEnd = currentInnings ? shouldEndInnings(events, rules, battingOrder, currentInnings.maxOvers, effectiveBallsPerOver, currentInnings.maxWickets) : { end: false };

  /** Batters who have not batted yet (next in order and after). Used for "new batter" selection after wicket. */
  const nextManIdx = 2 + (summary?.wickets ?? 0);
  const notYetBatted = battingOrder.slice(nextManIdx);

  /** Super Over: must select 2 batsmen + 1 bowler before scoring (for SO1 and SO2, and any further Super Overs). */
  const needSuperOverSelection =
    isSuperOver &&
    events.length === 0 &&
    (!(currentInnings?.battingOrderOverride && currentInnings.battingOrderOverride.length >= 2) || !currentInnings?.initialBowlerId);

  /** Normal innings (1st or 2nd): must select opening batting pair (striker & non-striker) before scoring. */
  const needOpeningPairSelection =
    currentInnings &&
    !isSuperOver &&
    events.length === 0 &&
    (!(currentInnings.battingOrderOverride && currentInnings.battingOrderOverride.length >= 2));

  /** Same bowler cannot bowl 2 consecutive Super Overs: exclude who bowled in the previous SO for this team. */
  const previousSOForBowlingTeam = (match?.innings ?? [])
    .slice(0, -1)
    .reverse()
    .find((inn) => inn.maxOvers === 1 && inn.bowlingTeamId === bowlingTeamId);
  const excludedBowlerId = previousSOForBowlingTeam
    ? (previousSOForBowlingTeam.initialBowlerId ?? (previousSOForBowlingTeam.events?.length ? previousSOForBowlingTeam.events[previousSOForBowlingTeam.events.length - 1]?.bowlerId : undefined))
    : undefined;
  const allowedBowlerIds = excludedBowlerId ? bowlingOrder.filter((id) => id !== excludedBowlerId) : bowlingOrder;
  const superOverRound = inningsIndex >= 2 ? Math.floor((inningsIndex - 2) / 2) + 1 : 1;
  const battingTeamName = teamsMap[battingTeamId] ?? (match?.teamAId === battingTeamId ? "Team A" : "Team B");
  const bowlingTeamName = teamsMap[bowlingTeamId] ?? (match?.teamAId === bowlingTeamId ? "Team A" : "Team B");
  const teamAName = teamsMap[match?.teamAId ?? ""] ?? "Team A";
  const teamBName = teamsMap[match?.teamBId ?? ""] ?? "Team B";

  /** Chase complete: second team passed target — show result, no more scoring. */
  const chaseComplete = isChasingInnings && runsNeeded <= 0 && firstInningsRuns > 0 && !isSuperOver;

  useEffect(() => {
    if (shouldEnd.end) setShowInningsOver(true);
  }, [shouldEnd.end]);

  /** When chasing team passes target, show result and prompt to go to scorecard (no need to continue). */
  useEffect(() => {
    if (isChasingInnings && runsNeeded <= 0 && firstInningsRuns > 0 && !isSuperOver) {
      setShowResultModal(true);
    }
  }, [isChasingInnings, runsNeeded, firstInningsRuns, isSuperOver]);

  const lastSoSelectionInningsRef = useRef<number>(-1);
  useEffect(() => {
    if (needSuperOverSelection && inningsIndex !== lastSoSelectionInningsRef.current) {
      lastSoSelectionInningsRef.current = inningsIndex;
      setSoStrikerId("");
      setSoNonStrikerId("");
      setSoBowlerId("");
    }
  }, [needSuperOverSelection, inningsIndex]);

  const lastOpeningPairInningsRef = useRef<number>(-1);
  useEffect(() => {
    if (needOpeningPairSelection && inningsIndex !== lastOpeningPairInningsRef.current) {
      lastOpeningPairInningsRef.current = inningsIndex;
      setOpeningStrikerId("");
      setOpeningNonStrikerId("");
    }
  }, [needOpeningPairSelection, inningsIndex]);

  async function saveSuperOverSelection() {
    if (!matchId || !match || !currentInnings || sending) return;
    if (!soStrikerId || !soNonStrikerId || soStrikerId === soNonStrikerId || !soBowlerId) return;
    setSending(true);
    const restBatting = defaultBattingOrder.filter((id) => id !== soStrikerId && id !== soNonStrikerId);
    const battingOrderOverride = [soStrikerId, soNonStrikerId, ...restBatting];
    const initialBowlerId = soBowlerId;
    const updatedInnings = [...(match.innings ?? [])];
    const lastIdx = updatedInnings.length - 1;
    if (lastIdx >= 0) {
      updatedInnings[lastIdx] = { ...updatedInnings[lastIdx]!, battingOrderOverride, initialBowlerId };
    }
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ innings: updatedInnings }),
      });
      const data = await res.json();
      if (data._id) {
        const innings = Array.isArray(data.innings) ? [...data.innings] : [...(match.innings ?? [])];
        if (lastIdx >= 0 && innings[lastIdx]) {
          innings[lastIdx] = { ...innings[lastIdx], battingOrderOverride, initialBowlerId };
        }
        setMatch({ ...data, innings });
        setCurrentBowlerId(initialBowlerId);
      }
    } finally {
      setSending(false);
    }
  }

  async function saveOpeningPairSelection() {
    if (!matchId || !match || !currentInnings || sending) return;
    if (!openingStrikerId || !openingNonStrikerId || openingStrikerId === openingNonStrikerId) return;
    setSending(true);
    const restBatting = defaultBattingOrder.filter((id) => id !== openingStrikerId && id !== openingNonStrikerId);
    const battingOrderOverride = [openingStrikerId, openingNonStrikerId, ...restBatting];
    const updatedInnings = [...(match.innings ?? [])];
    const lastIdx = updatedInnings.length - 1;
    if (lastIdx >= 0) {
      updatedInnings[lastIdx] = { ...updatedInnings[lastIdx]!, battingOrderOverride };
    }
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ innings: updatedInnings }),
      });
      const data = await res.json();
      if (data._id) {
        const innings = Array.isArray(data.innings) ? [...data.innings] : [...(match.innings ?? [])];
        if (lastIdx >= 0 && innings[lastIdx]) {
          innings[lastIdx] = { ...innings[lastIdx], battingOrderOverride };
        }
        setMatch({ ...data, innings });
      }
    } finally {
      setSending(false);
    }
  }

  async function addBall(payload: { runsOffBat: number; extras?: { type: "WD" | "NB" | "B" | "LB" | null; runs: number }; wicket?: { kind: string; batterOutId: string; fielderId?: string }; newBatterId?: string }) {
    if (!matchId || sending) return;
    setSending(true);
    // If wicket + new batter selected: update batting order so selected batter is next, then add wicket event
    if (payload.wicket && payload.newBatterId && match) {
      const newOrder = battingOrder.slice(0, nextManIdx).concat(payload.newBatterId).concat(battingOrder.slice(nextManIdx).filter((id) => id !== payload.newBatterId));
      const updatedInnings = [...(match.innings ?? [])];
      const lastIdx = updatedInnings.length - 1;
      if (lastIdx >= 0 && updatedInnings[lastIdx]) {
        updatedInnings[lastIdx] = { ...updatedInnings[lastIdx], battingOrderOverride: newOrder };
      }
      try {
        const patchRes = await fetch(`/api/matches/${matchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ innings: updatedInnings }),
        });
        const patchData = await patchRes.json();
        if (patchData._id) setMatch(patchData);
      } catch (_) {
        setSending(false);
        return;
      }
    }
    const body = {
      strikerId,
      nonStrikerId,
      bowlerId: currentBowlerId || bowlingOrder[0],
      runsOffBat: payload.runsOffBat ?? 0,
      extras: payload.extras ?? { type: null, runs: 0 },
      wicket: payload.wicket,
    };
    const res = await fetch(`/api/matches/${matchId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.match) setMatch(data.match);
    setShowWicket(false);
    setWicketStep(1);
    setNewBatterId("");
    setShowByesRuns(null);
    setSending(false);
  }

  async function undoLast() {
    if (!matchId || sending) return;
    setSending(true);
    const res = await fetch(`/api/matches/${matchId}/events/last`, { method: "DELETE" });
    const data = await res.json();
    if (data.match) setMatch(data.match);
    setSending(false);
  }

  async function endInnings() {
    if (!matchId || !match || sending) return;
    setSending(true);
    setShowInningsOver(false);
    const current = match.innings[match.innings.length - 1];
    const newInnings = {
      battingTeamId: current.bowlingTeamId,
      bowlingTeamId: current.battingTeamId,
      events: [] as BallEvent[],
      ...(current.maxOvers != null && { maxOvers: current.maxOvers }),
      ...(current.ballsPerOver != null && { ballsPerOver: current.ballsPerOver }),
      ...(current.maxWickets != null && { maxWickets: current.maxWickets }),
    };
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ innings: [...(match.innings ?? []), newInnings] }),
    });
    const data = await res.json();
    if (data._id) {
      setMatch(data);
      const newInn = data.innings?.[data.innings.length - 1];
      const newBowl = data.teamAId === newInn?.bowlingTeamId ? (data.playingXI_A ?? []) : (data.playingXI_B ?? []);
      setCurrentBowlerId(newBowl[0] ?? "");
    }
    setSending(false);
  }

  function selectNextBowler(id: string) {
    setCurrentBowlerId(id);
    setShowNextBowler(false);
  }

  /** Compute result for display (who won or tie). Uses last two innings for main or super over; supports multiple Super Over pairs. */
  function getMatchResult(): { message: string; isTie: boolean; isSuperOver?: boolean } {
    const inns = match?.innings ?? [];
    const isSO = inns.length >= 4 && (inns[inns.length - 1]?.maxOvers === 1);
    const first = isSO ? inns[inns.length - 2]! : inns[0];
    const second = isSO ? inns[inns.length - 1]! : inns[1];
    if (!first || !second) return { message: "", isTie: false };
    const bpo1 = first.ballsPerOver ?? rules.ballsPerOver;
    const bpo2 = second.ballsPerOver ?? rules.ballsPerOver;
    const r1 = computeInningsSummary(first.events ?? [], rules, bpo1).totalRuns;
    const w1 = computeInningsSummary(first.events ?? [], rules, bpo1).wickets;
    const r2 = computeInningsSummary(second.events ?? [], rules, bpo2).totalRuns;
    const w2 = computeInningsSummary(second.events ?? [], rules, bpo2).wickets;
    const team1Bat = first.battingTeamId;
    const team2Bat = second.battingTeamId;
    const team1Name = match?.teamAId === team1Bat ? teamAName : teamBName;
    const team2Name = match?.teamAId === team2Bat ? teamAName : teamBName;
    const maxWk = (match?.playingXI_A?.length ?? 11) - 1;
    if (r2 > r1) return { message: `${team2Name} won by ${maxWk - w2} wicket${maxWk - w2 !== 1 ? "s" : ""}`, isTie: false, isSuperOver: isSO };
    if (r2 < r1) return { message: `${team1Name} won by ${r1 - r2} run${r1 - r2 !== 1 ? "s" : ""}`, isTie: false, isSuperOver: isSO };
    return { message: "Match tied", isTie: true, isSuperOver: isSO };
  }

  function openResultModal() {
    setShowResultModal(true);
  }

  async function confirmEndMatch() {
    if (!matchId || sending) return;
    setSending(true);
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const data = await res.json();
    if (data._id) {
      setMatch(data);
      setShowResultModal(false);
      setShowInningsOver(false);
      router.push(`/matches/${matchId}/scorecard`);
    }
    setSending(false);
  }

  async function startSuperOver(ballsPerOver: number = 6) {
    if (!matchId || !match || sending) return;
    setSending(true);
    setShowResultModal(false);
    setShowSuperOverConfig(false);
    setShowInningsOver(false);
    const firstInn = match.innings[0];
    if (!firstInn) { setSending(false); return; }
    const teamBatFirst = firstInn.battingTeamId;
    const teamBowlFirst = firstInn.bowlingTeamId;
    // Add only Super Over 1; Super Over 2 is added when user clicks "Start Super Over 2" (via endInnings)
    const so1 = { battingTeamId: teamBowlFirst, bowlingTeamId: teamBatFirst, events: [] as BallEvent[], maxOvers: 1, ballsPerOver, maxWickets: 2 };
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ innings: [...(match.innings ?? []), so1], status: "IN_PROGRESS" }),
    });
    const data = await res.json();
    if (data._id) {
      setMatch(data);
      const newInn = data.innings?.[data.innings.length - 1];
      const newBowl = data.teamAId === newInn?.bowlingTeamId ? (data.playingXI_A ?? []) : (data.playingXI_B ?? []);
      setCurrentBowlerId(newBowl[0] ?? "");
    }
    setSending(false);
  }

  async function saveEditRules() {
    if (!matchId || !match || savingEdit) return;
    setSavingEdit(true);
    const nextRules = {
      ...match.rulesConfig,
      oversPerInnings: Math.max(1, editOversPerInnings),
      ...(oneOverComplete ? {} : { ballsPerOver: editBallsPerOver }),
    };
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulesConfig: nextRules }),
      });
      const data = await res.json();
      if (data._id) setMatch(data);
      setShowEditSheet(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function addPlayerToXI(team: "A" | "B", playerId: string) {
    if (!matchId || !match || savingEdit) return;
    const current = team === "A" ? (match.playingXI_A ?? []) : (match.playingXI_B ?? []);
    if (current.length >= 11 || current.includes(playerId)) return;
    const next = [...current, playerId];
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(team === "A" ? { playingXI_A: next } : { playingXI_B: next }),
      });
      const data = await res.json();
      if (data._id) setMatch(data);
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-5 w-5 border-cricket-green border-t-transparent text-cricket-green" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (match.status !== "IN_PROGRESS" || !currentInnings) {
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">No active innings.</p>
        <Link href={`/matches/${matchId}/scorecard`} className="text-cricket-green font-medium">View scorecard</Link>
      </div>
    );
  }

  const overStr = summary ? formatOvers(summary, effectiveBallsPerOver) : "0";

  const canEditMatch = !!(
    session?.user?.id &&
    match?.createdByUserId &&
    session.user.id === match.createdByUserId
  );

  return (
    <div className="min-h-screen pb-32 safe-area-pb">
      <header className="page-header">
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href="/matches">← Back</Link>
        </Button>
        <h1 className="text-lg font-bold truncate flex-1 text-center mx-2">{match.matchName}</h1>
        <div className="flex items-center gap-1">
          {canEditMatch && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white font-medium bg-white/20 hover:bg-white/30 border border-white/30"
              onClick={() => {
                setEditOversPerInnings(rules.oversPerInnings);
                setEditBallsPerOver(rules.ballsPerOver);
                setShowEditSheet(true);
              }}
            >
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-white font-medium bg-white/20 hover:bg-white/30 border border-white/30" asChild>
            <Link href={`/matches/${matchId}/scorecard`}>Scorecard</Link>
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {needSuperOverSelection ? (
          <div className="rounded-xl border border-amber-300 bg-white shadow-md p-6 text-center text-amber-900">
            <p className="font-medium">Select the two batsmen and the bowler in the dialog above to start this Super Over.</p>
          </div>
        ) : needOpeningPairSelection ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-md p-6 text-center text-gray-800">
            <p className="font-medium">Select the opening batting pair (striker and non-striker) in the dialog above to start this innings.</p>
          </div>
        ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "score" | "batting" | "bowling")} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/95 shadow border border-gray-200 p-1 rounded-xl h-12">
            <TabsTrigger value="score" className="rounded-lg data-[state=active]:bg-cricket-green data-[state=active]:text-white data-[state=inactive]:text-gray-700">Score</TabsTrigger>
            <TabsTrigger value="batting" className="rounded-lg data-[state=active]:bg-cricket-green data-[state=active]:text-white data-[state=inactive]:text-gray-700">Batting</TabsTrigger>
            <TabsTrigger value="bowling" className="rounded-lg data-[state=active]:bg-cricket-green data-[state=active]:text-white data-[state=inactive]:text-gray-700">Bowling</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="mt-0 space-y-4">
        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-xl p-5 mb-4 border border-gray-200/90">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              {isSuperOver && (
                <p className="text-xs font-semibold text-amber-600 mb-0.5">
                  Super Over {currentInnings?.maxWickets != null ? `· ${currentInnings.maxWickets} wkts max` : ""}
                </p>
              )}
              <span className="text-4xl font-bold text-cricket-green tabular-nums tracking-tight">
                {summary?.totalRuns ?? 0}
                <span className="text-gray-500 font-normal mx-0.5">/</span>
                {summary?.wickets ?? 0}
              </span>
              <p className="text-xs text-gray-600 mt-0.5">in {overStr} of {maxOversForInnings} over{maxOversForInnings !== 1 ? "s" : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-800">CRR</p>
              <p className="text-xl font-bold text-cricket-green tabular-nums">{summary?.runRate ?? 0}</p>
            </div>
          </div>
          {isChasingInnings && firstInningsRuns > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-800">Target <span className="text-cricket-green font-bold">{target}</span></p>
              <p className="text-sm text-gray-600">
                Need <span className="font-bold text-cricket-green">{runsNeeded}</span> in <span className="font-bold">{ballsLeft}</span> balls
                {ballsLeft > 0 && <span className="text-gray-500"> · RRR {requiredRR.toFixed(2)}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Striker & bowler */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-white shadow-md border border-gray-200/90 text-sm">
          <span className="text-gray-700">Striker: <span className="font-semibold text-gray-900">{playersMap[strikerId] ?? strikerId}</span></span>
          {canChangeBowler ? (
            <button
              type="button"
              onClick={() => setShowNextBowler(true)}
              className="text-left py-1 pr-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
            >
              <span className="text-gray-700">Bowler: </span>
              <span className="font-semibold text-cricket-green underline decoration-dotted">{(playersMap[currentBowlerId] ?? currentBowlerId) || "Tap to set"}</span>
            </button>
          ) : (
            <div className="py-1 pr-2">
              <span className="text-gray-700">Bowler: </span>
              <span className="font-semibold text-gray-900">{(playersMap[currentBowlerId] ?? currentBowlerId) || "—"}</span>
            </div>
          )}
        </div>

        {/* Runs: 0 1 2 3 4 6 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button
              key={r}
              onClick={() => addBall({ runsOffBat: r })}
              disabled={sending || !currentBowlerId || chaseComplete}
              className="min-h-[52px] py-4 rounded-xl bg-cricket-green text-white font-bold text-xl shadow-lg border-2 border-cricket-green/80 active:scale-95 transition-transform touch-manipulation disabled:opacity-50 disabled:active:scale-100"
            >
              {r}
            </button>
          ))}
        </div>

        {/* One-tap extras: WD, NB, B, LB */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => addBall({ runsOffBat: 0, extras: { type: "WD", runs: rules.wideRuns } })}
            disabled={sending || !currentBowlerId || chaseComplete}
            className="min-h-[48px] py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm shadow-md border border-amber-600/50 active:scale-95 touch-manipulation disabled:opacity-50"
          >
            Wide
          </button>
          <button
            onClick={() => addBall({ runsOffBat: 0, extras: { type: "NB", runs: rules.noBallRuns } })}
            disabled={sending || !currentBowlerId || chaseComplete}
            className="min-h-[48px] py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm shadow-md border border-amber-700/50 active:scale-95 touch-manipulation disabled:opacity-50"
          >
            No ball
          </button>
          <button
            onClick={() => setShowByesRuns(showByesRuns === "B" ? null : "B")}
            disabled={sending || !currentBowlerId || chaseComplete}
            className={`min-h-[48px] py-3 rounded-xl font-semibold text-sm shadow-md border active:scale-95 touch-manipulation disabled:opacity-50 ${showByesRuns === "B" ? "ring-2 ring-cricket-green bg-white border-cricket-green text-gray-900" : "bg-white border-amber-300 text-amber-900"}`}
          >
            Byes
          </button>
          <button
            onClick={() => setShowByesRuns(showByesRuns === "LB" ? null : "LB")}
            disabled={sending || !currentBowlerId || chaseComplete}
            className={`min-h-[48px] py-3 rounded-xl font-semibold text-sm shadow-md border active:scale-95 touch-manipulation disabled:opacity-50 ${showByesRuns === "LB" ? "ring-2 ring-cricket-green bg-white border-cricket-green text-gray-900" : "bg-white border-amber-200 text-amber-800"}`}
          >
            Leg byes
          </button>
        </div>

        {/* Byes / Leg byes runs: 0 1 2 3 4 */}
        {showByesRuns && (
          <div className="mb-4 p-3 bg-white rounded-xl border border-amber-200 shadow-md">
            <p className="text-xs font-medium text-amber-900 mb-2">Runs ({showByesRuns === "B" ? "Byes" : "Leg byes"})</p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((r) => (
                <button
                  key={r}
                  onClick={() => addBall({ runsOffBat: 0, extras: { type: showByesRuns, runs: r } })}
                  disabled={sending || chaseComplete}
                  className="w-12 h-12 rounded-lg bg-white border-2 border-amber-400 text-amber-900 font-bold shadow active:scale-95 touch-manipulation"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wicket & Undo & End */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => { setWicketStep(1); setNewBatterId(""); setWicketBatterId(""); setShowWicket(true); }}
            disabled={sending || !currentBowlerId || chaseComplete}
            variant="destructive"
            className="min-h-[48px] px-4 rounded-xl shadow-md border-2 border-red-800/50"
          >
            Wicket
          </Button>
          <Button
            onClick={undoLast}
            disabled={sending || events.length === 0}
            variant="outline"
            className="min-h-[48px] px-4 rounded-xl bg-white border-2 border-gray-300 text-gray-800 shadow-md hover:bg-gray-50"
          >
            Undo
          </Button>
          {!isSecondInnings && (
            <Button onClick={endInnings} disabled={sending} className="min-h-[48px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md border border-amber-700/50">
              End innings
            </Button>
          )}
          {isChasingInnings && (runsNeeded <= 0 || shouldEnd.end) && (
            <Button onClick={openResultModal} disabled={sending} variant="destructive" className="min-h-[48px] px-4 rounded-xl shadow-md">
              End match
            </Button>
          )}
        </div>

        {/* This over chips */}
        {events.length > 0 && (() => {
          let count = 0;
          const thisOver: BallEvent[] = [];
          for (let i = events.length - 1; i >= 0; i--) {
            const e = events[i];
            if (ballCounts(e, rules)) count++;
            thisOver.unshift(e);
            if (count >= effectiveBallsPerOver) break;
          }
          return (
            <div className="mt-5 p-3 rounded-xl bg-white/95 shadow border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">This over</p>
              <div className="flex flex-wrap gap-1.5">
                {thisOver.map((e) => {
                  const r = (e.runsOffBat ?? 0) + (e.extras?.runs ?? 0);
                  const w = e.wicket ? "W" : "";
                  const ext = e.extras?.type ?? "";
                  return (
                    <span key={e._id} className="inline-flex items-center justify-center min-w-[32px] px-2 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 font-medium text-sm">
                      {w || ext || (r > 0 ? r : "·")}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}
          </TabsContent>

          <TabsContent value="batting" className="mt-0">
          <div className="bg-white rounded-2xl shadow-lg border border-cricket-green/10 overflow-hidden">
            <div className="bg-cricket-green text-white px-4 py-2.5">
              <h2 className="font-bold text-sm">Batting – {battingTeamName}{isSuperOver ? " (Super Over)" : ""}</h2>
              <p className="text-xs text-white/90">{summary?.totalRuns ?? 0}/{summary?.wickets ?? 0} in {overStr} overs</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 pl-4 font-semibold text-gray-700">Batter</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">R</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">B</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">4s</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">6s</th>
                    <th className="text-right py-2.5 pr-4 font-semibold text-gray-700">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {battingCard.map((b) => (
                    <tr key={b.playerId} className="border-b border-gray-100">
                      <td className="py-2.5 pl-4">
                        <span className="font-medium text-gray-900">{playersMap[b.playerId] ?? b.playerId}</span>
                        {b.dismissalText && <span className="block text-xs text-gray-500">{b.dismissalText}</span>}
                      </td>
                      <td className="text-right py-2.5 pr-2 font-semibold tabular-nums">{b.runs}{!b.out && (b.balls > 0 || b.runs > 0) ? "*" : ""}</td>
                      <td className="text-right py-2.5 pr-2 text-gray-600 tabular-nums">{b.balls}</td>
                      <td className="text-right py-2.5 pr-2 text-gray-600 tabular-nums">{b.fours}</td>
                      <td className="text-right py-2.5 pr-2 text-gray-600 tabular-nums">{b.sixes}</td>
                      <td className="text-right py-2.5 pr-4 text-gray-600 tabular-nums">{b.strikeRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summary?.extrasBreakdown && Object.keys(summary.extrasBreakdown).length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-600">
                Extras: {Object.entries(summary.extrasBreakdown).map(([k, v]) => `${k} ${v}`).join(", ")}
              </div>
            )}
          </div>
          </TabsContent>

          <TabsContent value="bowling" className="mt-0">
          <div className="bg-white rounded-2xl shadow-lg border border-cricket-green/10 overflow-hidden">
            <div className="bg-cricket-green text-white px-4 py-2.5">
              <h2 className="font-bold text-sm">Bowling – {bowlingTeamName}{isSuperOver ? " (Super Over)" : ""}</h2>
              <p className="text-xs text-white/90">{summary?.totalRuns ?? 0}/{summary?.wickets ?? 0} in {overStr} overs</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[280px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2.5 pl-4 font-semibold text-gray-700">Bowler</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">O</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">R</th>
                    <th className="text-right py-2.5 pr-2 font-semibold text-gray-700">W</th>
                    <th className="text-right py-2.5 pr-4 font-semibold text-gray-700">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {bowlingFigures.map((f) => (
                    <tr key={f.playerId} className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 font-medium text-gray-900">{playersMap[f.playerId] ?? f.playerId}</td>
                      <td className="text-right py-2.5 pr-2 tabular-nums">{f.overs}.{f.balls}</td>
                      <td className="text-right py-2.5 pr-2 tabular-nums">{f.runsConceded}</td>
                      <td className="text-right py-2.5 pr-2 font-semibold tabular-nums">{f.wickets}</td>
                      <td className="text-right py-2.5 pr-4 tabular-nums text-gray-600">{f.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bowlingFigures.length === 0 && (
              <p className="px-4 py-6 text-center text-gray-500 text-sm">No bowling figures yet</p>
            )}
          </div>
          </TabsContent>
        </Tabs>
        )}
      </main>

      {/* Super Over: select who bats and who bowls before scoring */}
      <Dialog
        open={needSuperOverSelection}
        onOpenChange={(open) => {
          if (!open && matchId) router.push(`/matches/${matchId}/scorecard`);
        }}
      >
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Super Over {superOverRound} – Select team
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1 mb-4">
            <p className="font-medium text-foreground">Rules</p>
            <p>• 1 over (6 balls) per team. If 2 wickets fall, innings ends immediately.</p>
            <p>• Select 2 batters (anyone from playing XI) and 1 bowler. Same bowler cannot bowl 2 consecutive Super Overs.</p>
            <p>• More runs wins. If tied, another Super Over is played until there is a winner.</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary mb-3">Batting – {battingTeamName}</p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Striker (facing)</Label>
                  <Select value={soStrikerId || "_"} onValueChange={(v) => setSoStrikerId(v === "_" ? "" : v)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select batsman" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="_">Select</SelectItem>
                      {defaultBattingOrder.filter((id) => id !== soNonStrikerId).map((id) => (
                        <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Non-striker</Label>
                  <Select value={soNonStrikerId || "_"} onValueChange={(v) => setSoNonStrikerId(v === "_" ? "" : v)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select batsman" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="_">Select</SelectItem>
                      {defaultBattingOrder.filter((id) => id !== soStrikerId).map((id) => (
                        <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold text-primary mb-2">Bowling – {bowlingTeamName}</p>
              <div className="space-y-2">
                {excludedBowlerId && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1">
                    {playersMap[excludedBowlerId] ?? "Same bowler"} cannot bowl (bowled in previous Super Over).
                  </p>
                )}
                <Select value={soBowlerId || "_"} onValueChange={(v) => setSoBowlerId(v === "_" ? "" : v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select bowler" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="_">Select</SelectItem>
                    {allowedBowlerIds.map((id) => (
                      <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2 pt-4 flex-col sm:flex-row">
            <Button
              onClick={saveSuperOverSelection}
              disabled={sending || !soStrikerId || !soNonStrikerId || soStrikerId === soNonStrikerId || !soBowlerId}
              className="w-full h-11"
            >
              Start over
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={() => matchId && router.push(`/matches/${matchId}/scorecard`)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Normal innings: select opening batting pair (striker & non-striker) before scoring */}
      <Dialog open={!!needOpeningPairSelection} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-primary">
              {inningsIndex === 0 ? "1st innings" : "2nd innings"} – Opening batting pair
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select who will open the batting and who will face first (striker).
          </p>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-primary">Batting – {battingTeamName}</p>
            <div className="space-y-2">
              <Label>Striker (facing)</Label>
              <Select value={openingStrikerId || "_"} onValueChange={(v) => setOpeningStrikerId(v === "_" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select batsman" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="_">Select</SelectItem>
                  {defaultBattingOrder.filter((id) => id !== openingNonStrikerId).map((id) => (
                    <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Non-striker</Label>
              <Select value={openingNonStrikerId || "_"} onValueChange={(v) => setOpeningNonStrikerId(v === "_" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select batsman" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="_">Select</SelectItem>
                  {defaultBattingOrder.filter((id) => id !== openingStrikerId).map((id) => (
                    <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button
              onClick={saveOpeningPairSelection}
              disabled={sending || !openingStrikerId || !openingNonStrikerId || openingStrikerId === openingNonStrikerId}
              className="w-full h-11"
            >
              Start innings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change bowler (after over or tap anytime) */}
      <Sheet open={showNextBowler && !shouldEnd.end} onOpenChange={(open) => !open && setShowNextBowler(false)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="text-primary">{overJustFinished ? "Over complete" : "Change bowler"}</SheetTitle>
          </SheetHeader>
          <div className="p-4 max-h-64 overflow-y-auto space-y-2">
            {bowlingOrder
              .filter((id) => id !== currentBowlerId)
              .map((id) => (
                <Button
                  key={id}
                  variant="secondary"
                  className="w-full justify-start h-12 rounded-xl"
                  onClick={() => selectNextBowler(id)}
                >
                  {playersMap[id] ?? id}
                </Button>
              ))}
            {bowlingOrder.filter((id) => id !== currentBowlerId).length === 0 && (
              <p className="text-sm text-muted-foreground">No other bowler available.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Innings over */}
      <Dialog open={showInningsOver && shouldEnd.end} onOpenChange={(open) => !open && setShowInningsOver(false)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-primary">Innings over</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {summary?.totalRuns ?? 0}/{summary?.wickets ?? 0} in {overStr} overs
          </p>
          {inningsIndex % 2 === 0 && match && (() => {
            const nextBattingTeamId = bowlingTeamId;
            const nextBowlingTeamId = battingTeamId;
            const nextBattingName = teamsMap[nextBattingTeamId] ?? (match.teamAId === nextBattingTeamId ? "Team A" : "Team B");
            const nextBowlingName = teamsMap[nextBowlingTeamId] ?? (match.teamAId === nextBowlingTeamId ? "Team A" : "Team B");
            const nextBattingXI = (match.teamAId === nextBattingTeamId ? match.playingXI_A : match.playingXI_B) ?? [];
            const nextBowlingXI = (match.teamAId === nextBowlingTeamId ? match.playingXI_A : match.playingXI_B) ?? [];
            return (
              <div className="text-left space-y-3 pt-2 border-t">
                <p className="text-sm font-medium text-foreground">
                  {isSuperOver ? "Super Over 2" : "2nd innings"} — playing members
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Batting: {nextBattingName}</p>
                  <ul className="text-xs text-foreground list-disc list-inside pl-1 space-y-0.5">
                    {nextBattingXI.map((id) => (
                      <li key={id}>{playersMap[id] ?? id}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Bowling: {nextBowlingName}</p>
                  <ul className="text-xs text-foreground list-disc list-inside pl-1 space-y-0.5">
                    {nextBowlingXI.map((id) => (
                      <li key={id}>{playersMap[id] ?? id}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {inningsIndex % 2 === 0 ? (
              <Button onClick={endInnings} disabled={sending} className="w-full h-12">
                {isSuperOver ? "Start Super Over 2" : "Start 2nd innings"}
              </Button>
            ) : (
              <Button variant="destructive" onClick={() => { setShowInningsOver(false); openResultModal(); }} disabled={sending} className="w-full h-12">
                End match
              </Button>
            )}
            <Button variant="ghost" onClick={() => setShowInningsOver(false)} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result modal (who won / tie → Super Over) */}
      <Dialog open={showResultModal} onOpenChange={(open) => !open && setShowResultModal(false)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-primary">Result</DialogTitle>
          </DialogHeader>
          {showResultModal && (() => {
            const result = getMatchResult();
            const canGoToSuperOver = result.isTie && !result.isSuperOver && (match?.innings?.length ?? 0) >= 2;
            const canAnotherSuperOver = result.isTie && result.isSuperOver;
            return (
              <>
                <p className="text-lg font-semibold">{result.message}</p>
                {result.isSuperOver && <p className="text-sm text-muted-foreground">(Super over)</p>}
                <DialogFooter className="flex-col gap-2 sm:flex-col">
                  <Button onClick={confirmEndMatch} disabled={sending} className="w-full h-11">
                    {result.isTie ? "Done" : "View scorecard"}
                  </Button>
                  {canGoToSuperOver && (
                    <Button onClick={() => { setShowResultModal(false); setShowSuperOverConfig(true); }} disabled={sending} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white">
                      Go to Super Over
                    </Button>
                  )}
                  {canAnotherSuperOver && (
                    <Button onClick={() => { setShowResultModal(false); setShowSuperOverConfig(true); }} disabled={sending} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white">
                      Another Super Over
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setShowResultModal(false)} className="w-full">Cancel</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Super Over config: balls per over */}
      <Dialog open={showSuperOverConfig} onOpenChange={(open) => !open && setShowSuperOverConfig(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-primary">Super Over</DialogTitle>
          </DialogHeader>
          <Label className="text-muted-foreground">Balls per over</Label>
          <div className="flex gap-2">
            {[4, 5, 6].map((n) => (
              <Button
                key={n}
                type="button"
                variant={superOverBallsPerOver === n ? "default" : "secondary"}
                className="flex-1 h-12 rounded-xl"
                onClick={() => setSuperOverBallsPerOver(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowSuperOverConfig(false)} className="flex-1">
              Back
            </Button>
            <Button onClick={() => startSuperOver(superOverBallsPerOver)} disabled={sending} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              Start Super Over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wicket sheet */}
      <Sheet
        open={showWicket}
        onOpenChange={(open) => {
          if (!open) {
            setShowWicket(false);
            setWicketStep(1);
            setNewBatterId("");
            setWicketBatterId("");
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{wicketStep === 1 ? "Wicket" : "New batter"}</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {wicketStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["BOWLED", "Bowled"],
                        ["CAUGHT", "Caught"],
                        ["LBW", "LBW"],
                        ["RUN_OUT", "Run out"],
                        ["STUMPED", "Stumped"],
                        ["HIT_WICKET", "Hit wkt"],
                        ["RETIRED", "Retired"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        type="button"
                        variant={wicketKind === value ? "default" : "outline"}
                        size="sm"
                        className="h-9 rounded-xl"
                        onClick={() => setWicketKind(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Batter out</Label>
                  <div className="flex flex-wrap gap-2">
                    {strikerId && (
                      <Button
                        type="button"
                        variant={wicketBatterId === strikerId ? "default" : "outline"}
                        size="sm"
                        className="h-10 rounded-xl flex-1 min-w-0"
                        onClick={() => setWicketBatterId(strikerId)}
                      >
                        {playersMap[strikerId] ?? strikerId}
                      </Button>
                    )}
                    {nonStrikerId && nonStrikerId !== strikerId && (
                      <Button
                        type="button"
                        variant={wicketBatterId === nonStrikerId ? "default" : "outline"}
                        size="sm"
                        className="h-10 rounded-xl flex-1 min-w-0"
                        onClick={() => setWicketBatterId(nonStrikerId)}
                      >
                        {playersMap[nonStrikerId] ?? nonStrikerId}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowWicket(false)} className="flex-1 h-12 rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => wicketBatterId && setWicketStep(2)}
                    disabled={!wicketBatterId}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
            {wicketStep === 2 && (
              <>
                <p className="text-sm text-muted-foreground">Select the new batter (not yet batted)</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notYetBatted.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No batters left (innings will end).</p>
                  ) : (
                    notYetBatted.map((id) => (
                      <Button
                        key={id}
                        variant={newBatterId === id ? "default" : "outline"}
                        className="w-full justify-start h-12 rounded-xl"
                        onClick={() => setNewBatterId(id)}
                      >
                        {playersMap[id] ?? id}
                      </Button>
                    ))
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setWicketStep(1)} className="flex-1 h-12 rounded-xl">
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!wicketBatterId) return;
                      if (notYetBatted.length === 0) {
                        addBall({ runsOffBat: 0, wicket: { kind: wicketKind, batterOutId: wicketBatterId } });
                      } else if (newBatterId) {
                        addBall({
                          runsOffBat: 0,
                          wicket: { kind: wicketKind, batterOutId: wicketBatterId },
                          newBatterId,
                        });
                      }
                    }}
                    disabled={sending || (notYetBatted.length > 0 && !newBatterId)}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Confirm wicket
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit match: rules + add player to playing XI */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-primary">Edit match</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <Label>Total overs per innings</Label>
              <Input
                type="number"
                min={1}
                value={editOversPerInnings}
                onChange={(e) => setEditOversPerInnings(Math.max(1, +e.target.value || 1))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Balls per over {oneOverComplete && "(locked after first over)"}</Label>
              <Input
                type="number"
                min={4}
                max={8}
                value={editBallsPerOver}
                onChange={(e) => setEditBallsPerOver(Math.min(8, Math.max(4, +e.target.value || 6)))}
                className="h-11"
                disabled={oneOverComplete}
              />
            </div>
            <div className="pt-2 border-t space-y-3">
              <Label>Playing XI</Label>
              {match && (() => {
                const teamA = teamsList.find((t) => t._id === match.teamAId);
                const teamB = teamsList.find((t) => t._id === match.teamBId);
                const xiA = match.playingXI_A ?? [];
                const xiB = match.playingXI_B ?? [];
                const availableA = (teamA?.playerIds ?? []).filter((id) => !xiA.includes(id));
                const availableB = (teamB?.playerIds ?? []).filter((id) => !xiB.includes(id));
                return (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground">{teamsMap[match.teamAId] ?? "Team A"}</p>
                      <ul className="text-sm list-disc list-inside">
                        {xiA.map((id) => (
                          <li key={id}>{playersMap[id] ?? id}</li>
                        ))}
                      </ul>
                      {xiA.length < 11 && availableA.length > 0 && (
                        <Select
                          key={`add-a-${xiA.length}`}
                          onValueChange={(v) => v && addPlayerToXI("A", v)}
                          disabled={savingEdit}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Add player…" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableA.map((id) => (
                              <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-muted-foreground">{teamsMap[match.teamBId] ?? "Team B"}</p>
                      <ul className="text-sm list-disc list-inside">
                        {xiB.map((id) => (
                          <li key={id}>{playersMap[id] ?? id}</li>
                        ))}
                      </ul>
                      {xiB.length < 11 && availableB.length > 0 && (
                        <Select
                          key={`add-b-${xiB.length}`}
                          onValueChange={(v) => v && addPlayerToXI("B", v)}
                          disabled={savingEdit}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Add player…" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableB.map((id) => (
                              <SelectItem key={id} value={id}>{playersMap[id] ?? id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditSheet(false)} className="flex-1" disabled={savingEdit}>
                Cancel
              </Button>
              <Button onClick={saveEditRules} disabled={savingEdit} className="flex-1 bg-cricket-green text-white hover:bg-cricket-green/90">
                {savingEdit ? "Saving…" : "Save rules"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
