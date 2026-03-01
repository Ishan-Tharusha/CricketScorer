import { runsFromBall, ballCounts } from "@/lib/engine";
import type { BallEvent, RulesConfig } from "@/lib/types";
import { DEFAULT_RULES } from "@/lib/types";

/** Match-like shape (from DB lean) for stats computation. */
export interface MatchForStats {
  teamAId: string;
  teamBId: string;
  playingXI_A: string[];
  playingXI_B: string[];
  rulesConfig?: RulesConfig;
  innings: {
    battingTeamId: string;
    bowlingTeamId: string;
    events: BallEvent[];
    battingOrderOverride?: string[];
    ballsPerOver?: number;
  }[];
}

export interface PlayerStatsResult {
  matchesPlayed: number;
  batting: {
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
  };
  bowling: {
    wickets: number;
    runsConceded: number;
    balls: number;
    economy: number | null;
    average: number | null;
  };
  runsPerInnings: number[];
}

/** Compute batting + bowling stats for one player from a list of matches. */
export function computePlayerStats(playerId: string, matches: MatchForStats[]): PlayerStatsResult {
  const relevantMatches = matches.filter(
    (m) => (m.playingXI_A ?? []).includes(playerId) || (m.playingXI_B ?? []).includes(playerId)
  );

  let battingRuns = 0;
  let battingBalls = 0;
  let battingFours = 0;
  let battingSixes = 0;
  let battingInnings = 0;
  let battingDismissals = 0;
  const runsPerInnings: number[] = [];

  let bowlingWickets = 0;
  let bowlingRunsConceded = 0;
  let bowlingBalls = 0;

  for (const match of relevantMatches) {
    const rules: RulesConfig = {
      ...DEFAULT_RULES,
      ...(match.rulesConfig ?? {}),
    };
    const inningsList = match.innings ?? [];

    for (const innings of inningsList) {
      const events: BallEvent[] = innings.events ?? [];
      const battingTeamId = innings.battingTeamId;
      const bowlingTeamId = innings.bowlingTeamId;
      const defaultBatOrder =
        match.teamAId === battingTeamId ? match.playingXI_A ?? [] : match.playingXI_B ?? [];
      const batOrder = (innings.battingOrderOverride?.length
        ? innings.battingOrderOverride
        : defaultBatOrder) as string[];
      const bowlOrder =
        match.teamAId === bowlingTeamId ? match.playingXI_A ?? [] : match.playingXI_B ?? [];

      const playerBatted = batOrder.includes(playerId);
      const playerBowled = bowlOrder.includes(playerId);

      if (playerBatted) {
        let runsThisInnings = 0;
        let facedBall = false;
        for (const e of events) {
          if (e.strikerId !== playerId) continue;
          const batRuns = e.runsOffBat ?? 0;
          battingRuns += batRuns;
          runsThisInnings += batRuns;
          const countsAsBall =
            !e.extras?.type || (e.extras.type !== "WD" && e.extras.type !== "NB");
          if (countsAsBall) {
            battingBalls += 1;
            facedBall = true;
          }
          if (batRuns === 4) battingFours += 1;
          if (batRuns === 6) battingSixes += 1;
          if (e.wicket?.batterOutId === playerId) battingDismissals += 1;
        }
        if (facedBall) {
          battingInnings += 1;
          runsPerInnings.push(runsThisInnings);
        }
      }

      if (playerBowled) {
        for (const e of events) {
          if (e.bowlerId !== playerId) continue;
          bowlingRunsConceded += runsFromBall(e);
          if (ballCounts(e, rules)) bowlingBalls += 1;
          if (e.wicket) bowlingWickets += 1;
        }
      }
    }
  }

  const battingAverage =
    battingDismissals > 0 ? Math.round((battingRuns / battingDismissals) * 100) / 100 : null;
  const battingStrikeRate =
    battingBalls > 0 ? Math.round((battingRuns / battingBalls) * 100 * 100) / 100 : null;
  const fifties = runsPerInnings.filter((r) => r >= 50 && r < 100).length;
  const hundreds = runsPerInnings.filter((r) => r >= 100).length;

  const bowlingOvers = bowlingBalls > 0 ? bowlingBalls / 6 : 0;
  const bowlingEconomy =
    bowlingOvers > 0 ? Math.round((bowlingRunsConceded / bowlingOvers) * 100) / 100 : null;
  const bowlingAverage =
    bowlingWickets > 0
      ? Math.round((bowlingRunsConceded / bowlingWickets) * 100) / 100
      : null;

  return {
    matchesPlayed: relevantMatches.length,
    batting: {
      runs: battingRuns,
      balls: battingBalls,
      innings: battingInnings,
      dismissals: battingDismissals,
      average: battingAverage,
      strikeRate: battingStrikeRate,
      fours: battingFours,
      sixes: battingSixes,
      fifties,
      hundreds,
    },
    bowling: {
      wickets: bowlingWickets,
      runsConceded: bowlingRunsConceded,
      balls: bowlingBalls,
      economy: bowlingEconomy,
      average: bowlingAverage,
    },
    runsPerInnings,
  };
}
