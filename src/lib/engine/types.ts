import type { BallEvent, RulesConfig, ExtrasType } from "@/lib/types";

export type { BallEvent, RulesConfig };

export interface InningsSummary {
  totalRuns: number;
  wickets: number;
  overs: number;
  balls: number;
  totalBallsBowled: number;
  runRate: number;
  extrasBreakdown: Record<ExtrasType extends string ? ExtrasType : string, number>;
}

export interface BattingEntry {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  out: boolean;
  dismissalText?: string;
}

export interface BowlingEntry {
  playerId: string;
  overs: number;
  balls: number;
  runsConceded: number;
  wickets: number;
  economy: number;
}
