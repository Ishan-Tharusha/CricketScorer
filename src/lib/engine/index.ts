import type { BallEvent, RulesConfig, WicketKind } from "@/lib/types";
import type { InningsSummary, BattingEntry, BowlingEntry } from "./types";

/** Total runs from a single ball (bat + extras). */
export function runsFromBall(e: BallEvent): number {
  const bat = e.runsOffBat ?? 0;
  const ext = e.extras?.runs ?? 0;
  return bat + ext;
}

/** Whether this delivery counts as a ball (for over progression). */
export function ballCounts(e: BallEvent, rules: RulesConfig): boolean {
  if (!e.extras?.type) return true;
  if (e.extras.type === "WD") return rules.wideCountsAsBall;
  if (e.extras.type === "NB") return rules.noBallCountsAsBall;
  return true;
}

/** Compute innings summary from events and rules. */
export function computeInningsSummary(
  events: BallEvent[],
  rules: RulesConfig,
  ballsPerOverOverride?: number
): InningsSummary {
  const bpo = ballsPerOverOverride ?? rules.ballsPerOver;
  let totalRuns = 0;
  let wickets = 0;
  let balls = 0;
  const extrasBreakdown: Record<string, number> = {};

  for (const e of events) {
    totalRuns += runsFromBall(e);
    if (e.wicket) wickets += 1;
    if (e.extras?.type) {
      const key = e.extras.type;
      extrasBreakdown[key] = (extrasBreakdown[key] ?? 0) + (e.extras.runs ?? 0);
    }
    if (ballCounts(e, rules)) balls += 1;
  }

  const overs = Math.floor(balls / bpo);
  const ballsInOver = balls % bpo;
  const totalBallsBowled = balls;
  const runRate = totalBallsBowled > 0 ? totalRuns / (totalBallsBowled / bpo) : 0;

  return {
    totalRuns,
    wickets,
    overs,
    balls: ballsInOver,
    totalBallsBowled,
    runRate: Math.round(runRate * 100) / 100,
    extrasBreakdown,
  };
}

/** Format overs as "overs.balls" (e.g. 12.3). */
export function formatOvers(summary: InningsSummary, ballsPerOver: number): string {
  const totalBalls = summary.overs * ballsPerOver + summary.balls;
  const o = Math.floor(totalBalls / ballsPerOver);
  const b = totalBalls % ballsPerOver;
  return b === 0 ? `${o}` : `${o}.${b}`;
}

/** Batting card for one innings. */
export function computeBattingCard(
  events: BallEvent[],
  battingTeamPlayerIds: string[]
): BattingEntry[] {
  const byPlayer: Record<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean; dismissalText?: string }> = {};
  for (const id of battingTeamPlayerIds) {
    byPlayer[id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
  }

  for (const e of events) {
    const batRuns = e.runsOffBat ?? 0;
    const extRuns = e.extras?.runs ?? 0;

    // Ball counted for striker (only if not wide/no-ball for batting stats; typically we count balls faced on legal deliveries)
    const countsAsBall = !e.extras?.type || (e.extras.type !== "WD" && e.extras.type !== "NB");
    if (byPlayer[e.strikerId]) {
      byPlayer[e.strikerId].runs += batRuns;
      if (countsAsBall) byPlayer[e.strikerId].balls += 1;
      if (batRuns === 4) byPlayer[e.strikerId].fours += 1;
      if (batRuns === 6) byPlayer[e.strikerId].sixes += 1;
    }

    if (e.wicket) {
      const pid = e.wicket.batterOutId;
      if (byPlayer[pid]) {
        byPlayer[pid].out = true;
        byPlayer[pid].dismissalText = formatDismissal(e.wicket.kind, e.wicket.fielderId);
      }
    }
  }

  return battingTeamPlayerIds.map((playerId) => {
    const p = byPlayer[playerId] ?? { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissalText: undefined };
    const sr = p.balls > 0 ? (p.runs / p.balls) * 100 : 0;
    return {
      playerId,
      runs: p.runs,
      balls: p.balls,
      fours: p.fours,
      sixes: p.sixes,
      strikeRate: Math.round(sr * 100) / 100,
      out: p.out,
      dismissalText: p.dismissalText,
    };
  });
}

function formatDismissal(kind: WicketKind, fielderId?: string): string {
  switch (kind) {
    case "BOWLED":
      return "b";
    case "CAUGHT":
      return fielderId ? `c ? b` : "c ? b"; // Caller can substitute fielder name
    case "LBW":
      return "lbw b";
    case "RUN_OUT":
      return fielderId ? "run out (?)" : "run out";
    case "STUMPED":
      return fielderId ? "st ? b" : "st b";
    case "HIT_WICKET":
      return "hit wicket b";
    case "RETIRED":
      return "retired";
    default:
      return "b";
  }
}

/** Bowling figures for one innings. */
export function computeBowlingFigures(
  events: BallEvent[],
  rules: RulesConfig,
  bowlingTeamPlayerIds: string[],
  ballsPerOverOverride?: number
): BowlingEntry[] {
  const bpo = ballsPerOverOverride ?? rules.ballsPerOver;
  const byBowler: Record<string, { balls: number; runs: number; wickets: number }> = {};
  for (const id of bowlingTeamPlayerIds) {
    byBowler[id] = { balls: 0, runs: 0, wickets: 0 };
  }

  for (const e of events) {
    const bowlerId = e.bowlerId;
    if (!byBowler[bowlerId]) byBowler[bowlerId] = { balls: 0, runs: 0, wickets: 0 };

    byBowler[bowlerId].runs += runsFromBall(e);
    if (e.wicket) byBowler[bowlerId].wickets += 1;
    if (ballCounts(e, rules)) byBowler[bowlerId].balls += 1;
  }

  return bowlingTeamPlayerIds.map((playerId) => {
    const p = byBowler[playerId] ?? { balls: 0, runs: 0, wickets: 0 };
    const totalBalls = p.balls;
    const overs = Math.floor(totalBalls / bpo) + (totalBalls % bpo) / bpo;
    const economy = overs > 0 ? p.runs / overs : 0;
    return {
      playerId,
      overs: Math.floor(totalBalls / bpo),
      balls: totalBalls % bpo,
      runsConceded: p.runs,
      wickets: p.wickets,
      economy: Math.round(economy * 100) / 100,
    };
  });
}

/** Get current striker and non-striker after applying all events (for next ball). */
export function getCurrentBatters(
  events: BallEvent[],
  battingOrder: string[],
  rules: RulesConfig
): { strikerId: string; nonStrikerId: string } {
  if (battingOrder.length < 2) {
    return { strikerId: battingOrder[0] ?? "", nonStrikerId: battingOrder[1] ?? "" };
  }
  let strikerIdx = 0;
  let nonStrikerIdx = 1;
  let strikeEnd = "striker"; // who is on strike: "striker" = battingOrder[strikerIdx], "non" = battingOrder[nonStrikerIdx]

  for (const e of events) {
    const runs = runsFromBall(e);
    const counts = ballCounts(e, rules);

    if (e.wicket) {
      const outId = e.wicket.batterOutId;
      const nextIdx = Math.max(strikerIdx, nonStrikerIdx) + 1;
      if (nextIdx >= battingOrder.length) {
        return { strikerId: battingOrder[strikerIdx]!, nonStrikerId: battingOrder[nonStrikerIdx] ?? "" };
      }
      if (outId === battingOrder[strikerIdx]) {
        strikerIdx = nextIdx;
        // New batter at striker end; non-striker stays
      } else {
        nonStrikerIdx = nextIdx;
        // Swap so striker is the one who wasn't out
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
      }
      continue;
    }

    // Strike rotation: odd runs swap ends
    if (runs % 2 === 1) {
      strikeEnd = strikeEnd === "striker" ? "non" : "striker";
    }
    // End of over: swap
    if (counts) {
      const ballsInOver = events
        .filter((x) => ballCounts(x, rules))
        .slice(0, events.indexOf(e) + 1)
        .length;
      const inThisOver = events
        .slice(0, events.indexOf(e) + 1)
        .filter((x) => ballCounts(x, rules));
      let ballCount = 0;
      let currentOver = 0;
      for (const ev of events) {
        if (!ballCounts(ev, rules)) continue;
        ballCount += 1;
        if (ballCount >= rules.ballsPerOver) {
          ballCount = 0;
          currentOver += 1;
        }
        if (ev === e) break;
      }
      if (ballCount === 0 && events.indexOf(e) > 0) {
        strikeEnd = strikeEnd === "striker" ? "non" : "striker";
      }
    }
  }

  const s = strikeEnd === "striker" ? strikerIdx : nonStrikerIdx;
  const n = strikeEnd === "striker" ? nonStrikerIdx : strikerIdx;
  return {
    strikerId: battingOrder[s] ?? "",
    nonStrikerId: battingOrder[n] ?? "",
  };
}

/** Simplified: just track who is on strike by iterating (odd runs + over end swap). */
export function getCurrentBattersSimple(
  events: BallEvent[],
  battingOrder: string[],
  rules: RulesConfig
): { strikerId: string; nonStrikerId: string } {
  if (battingOrder.length === 0) return { strikerId: "", nonStrikerId: "" };
  if (battingOrder.length === 1) return { strikerId: battingOrder[0]!, nonStrikerId: "" };

  let idx1 = 0;
  let idx2 = 1;
  let strikerIsFirst = true; // true => idx1 is striker

  let ballsInCurrentOver = 0;

  for (const e of events) {
    const runs = runsFromBall(e);
    const counts = ballCounts(e, rules);

    if (e.wicket) {
      const outId = e.wicket.batterOutId;
      const nextMan = Math.max(idx1, idx2) + 1;
      if (nextMan >= battingOrder.length) {
        return { strikerId: battingOrder[strikerIsFirst ? idx1 : idx2]!, nonStrikerId: battingOrder[strikerIsFirst ? idx2 : idx1]! };
      }
      if (outId === battingOrder[idx1]) {
        idx1 = nextMan;
        strikerIsFirst = true;
      } else {
        idx2 = nextMan;
        strikerIsFirst = false;
      }
      continue;
    }

    if (runs % 2 === 1) strikerIsFirst = !strikerIsFirst;
    if (counts) {
      ballsInCurrentOver += 1;
      if (ballsInCurrentOver >= rules.ballsPerOver) {
        ballsInCurrentOver = 0;
        strikerIsFirst = !strikerIsFirst;
      }
    }
  }

  const strikerIdx = strikerIsFirst ? idx1 : idx2;
  const nonIdx = strikerIsFirst ? idx2 : idx1;
  return {
    strikerId: battingOrder[strikerIdx] ?? "",
    nonStrikerId: battingOrder[nonIdx] ?? "",
  };
}

/** Check if innings should end: all out or overs complete. */
export function shouldEndInnings(
  events: BallEvent[],
  rules: RulesConfig,
  battingOrder: string[],
  maxOversOverride?: number,
  ballsPerOverOverride?: number,
  maxWicketsOverride?: number
): { end: boolean; reason?: "ALL_OUT" | "OVERS_COMPLETE" } {
  const bpo = ballsPerOverOverride ?? rules.ballsPerOver;
  const summary = computeInningsSummary(events, rules, bpo);
  const oversLimit = maxOversOverride ?? rules.oversPerInnings;
  const maxBalls = oversLimit * bpo;
  if (summary.totalBallsBowled >= maxBalls) return { end: true, reason: "OVERS_COMPLETE" };
  const wicketsLost = summary.wickets;
  const maxWickets =
    maxWicketsOverride ??
    (rules.lastManStandingRule ? battingOrder.length : battingOrder.length - 1);
  if (wicketsLost >= maxWickets) return { end: true, reason: "ALL_OUT" };
  return { end: false };
}
