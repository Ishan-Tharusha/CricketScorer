import { describe, it, expect } from "vitest";
import {
  computeInningsSummary,
  computeBattingCard,
  computeBowlingFigures,
  runsFromBall,
  ballCounts,
  formatOvers,
  getCurrentBattersSimple,
  shouldEndInnings,
} from "./index";
import type { BallEvent, RulesConfig } from "@/lib/types";

const RULES: RulesConfig = {
  oversPerInnings: 20,
  ballsPerOver: 6,
  wideRuns: 1,
  noBallRuns: 1,
  wideCountsAsBall: true,
  noBallCountsAsBall: true,
};

function ev(over: number, ball: number, runsOffBat: number, extras?: { type: "WD" | "NB" | "B" | "LB"; runs: number }, wicket?: BallEvent["wicket"]): BallEvent {
  return {
    _id: `e-${over}-${ball}`,
    createdAt: new Date().toISOString(),
    strikerId: "s1",
    nonStrikerId: "s2",
    bowlerId: "b1",
    overNumber: over,
    ballInOver: ball,
    runsOffBat,
    extras: extras ?? { type: null, runs: 0 },
    wicket,
  };
}

describe("runsFromBall", () => {
  it("sums bat and extras", () => {
    expect(runsFromBall(ev(1, 1, 2, { type: "WD", runs: 1 }))).toBe(3);
    expect(runsFromBall(ev(1, 1, 0))).toBe(0);
  });
});

describe("ballCounts", () => {
  it("counts normal ball", () => {
    expect(ballCounts(ev(1, 1, 0), RULES)).toBe(true);
  });
  it("respects wideCountsAsBall", () => {
    expect(ballCounts(ev(1, 1, 0, { type: "WD", runs: 1 }), { ...RULES, wideCountsAsBall: true })).toBe(true);
    expect(ballCounts(ev(1, 1, 0, { type: "WD", runs: 1 }), { ...RULES, wideCountsAsBall: false })).toBe(false);
  });
});

describe("computeInningsSummary", () => {
  it("sums runs and wickets", () => {
    const events: BallEvent[] = [
      ev(1, 1, 1),
      ev(1, 2, 4),
      ev(1, 3, 0, undefined, { kind: "BOWLED", batterOutId: "s1" }),
    ];
    const s = computeInningsSummary(events, RULES);
    expect(s.totalRuns).toBe(5);
    expect(s.wickets).toBe(1);
    expect(s.overs).toBe(0);
    expect(s.balls).toBe(3);
  });

  it("counts extras", () => {
    const events: BallEvent[] = [
      ev(1, 1, 0, { type: "WD", runs: 1 }),
      ev(1, 2, 0, { type: "WD", runs: 2 }),
    ];
    const s = computeInningsSummary(events, RULES);
    expect(s.totalRuns).toBe(3);
    expect(s.extrasBreakdown["WD"]).toBe(3);
  });
});

describe("computeBattingCard", () => {
  it("aggregates runs and balls per batter", () => {
    const events: BallEvent[] = [
      { ...ev(1, 1, 4), strikerId: "p1", nonStrikerId: "p2" },
      { ...ev(1, 2, 2), strikerId: "p1", nonStrikerId: "p2" },
      { ...ev(1, 3, 1), strikerId: "p1", nonStrikerId: "p2" },
    ];
    const card = computeBattingCard(events, ["p1", "p2"]);
    expect(card.find((c) => c.playerId === "p1")?.runs).toBe(7);
    expect(card.find((c) => c.playerId === "p1")?.balls).toBe(3);
    expect(card.find((c) => c.playerId === "p1")?.fours).toBe(1);
  });
});

describe("computeBowlingFigures", () => {
  it("aggregates overs runs wickets per bowler", () => {
    const events: BallEvent[] = [
      { ...ev(1, 1, 1), bowlerId: "b1" },
      { ...ev(1, 2, 0, undefined, { kind: "BOWLED", batterOutId: "s1" }), bowlerId: "b1" },
      { ...ev(1, 3, 4), bowlerId: "b1" },
    ];
    const fig = computeBowlingFigures(events, RULES, ["b1"]);
    expect(fig[0].runsConceded).toBe(5);
    expect(fig[0].wickets).toBe(1);
    expect(fig[0].overs).toBe(0);
    expect(fig[0].balls).toBe(3);
  });
});

describe("formatOvers", () => {
  it("formats overs.balls", () => {
    expect(formatOvers({ overs: 5, balls: 3, totalRuns: 0, wickets: 0, totalBallsBowled: 33, runRate: 0, extrasBreakdown: {} }, 6)).toBe("5.3");
  });
});

describe("getCurrentBattersSimple", () => {
  it("starts with first two", () => {
    const r = getCurrentBattersSimple([], ["a", "b"], RULES);
    expect(r.strikerId).toBe("a");
    expect(r.nonStrikerId).toBe("b");
  });
  it("rotates on odd runs", () => {
    const events: BallEvent[] = [
      { ...ev(1, 1, 1), strikerId: "a", nonStrikerId: "b" },
    ];
    const r = getCurrentBattersSimple(events, ["a", "b"], RULES);
    expect(r.strikerId).toBe("b");
    expect(r.nonStrikerId).toBe("a");
  });
});

describe("shouldEndInnings", () => {
  it("ends when overs complete", () => {
    const events: BallEvent[] = Array.from({ length: 120 }, (_, i) =>
      ev(Math.floor(i / 6) + 1, (i % 6) + 1, 0)
    );
    const r = shouldEndInnings(events, RULES, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]);
    expect(r.end).toBe(true);
    expect(r.reason).toBe("OVERS_COMPLETE");
  });
});
