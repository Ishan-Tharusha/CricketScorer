// Domain types for cricket scoring app

export type BattingStyle = "RIGHT" | "LEFT";
export type BowlingStyle = "RIGHT_ARM_FAST" | "RIGHT_ARM_MEDIUM" | "RIGHT_ARM_OFF" | "RIGHT_ARM_LEG" | "LEFT_ARM_FAST" | "LEFT_ARM_ORTHODOX" | "LEFT_ARM_CHINAMAN" | "OTHER";

export type PlayerRole = "player" | "admin";

export interface Player {
  _id: string;
  fullName: string;
  shortName?: string;
  /** Optional email for future login; when user logs in, profile can show stats (batting/bowling skills, etc.). */
  email?: string;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  isKeeper?: boolean;
  /** Admin can edit any player; default is "player". */
  role?: PlayerRole;
  /** Player ID of the user who created this record (so they can edit it). Set when creating via API. */
  createdBy?: string;
}

export interface Team {
  _id: string;
  teamName: string;
  playerIds: string[];
  defaultPlayingXIIds?: string[];
}

export interface RulesConfig {
  oversPerInnings: number;
  ballsPerOver: number;
  maxOversPerBowler?: number;
  wideRuns: number;
  noBallRuns: number;
  wideCountsAsBall: boolean;
  noBallCountsAsBall: boolean;
  lastManStandingRule?: boolean;
}

export const DEFAULT_RULES: RulesConfig = {
  oversPerInnings: 20,
  ballsPerOver: 6,
  wideRuns: 1,
  noBallRuns: 1,
  wideCountsAsBall: false,
  noBallCountsAsBall: false,
};

export type ExtrasType = "WD" | "NB" | "B" | "LB" | null;

export interface Extras {
  type: ExtrasType;
  runs: number;
}

export type WicketKind =
  | "BOWLED"
  | "CAUGHT"
  | "LBW"
  | "RUN_OUT"
  | "STUMPED"
  | "HIT_WICKET"
  | "RETIRED";

export interface WicketInfo {
  kind: WicketKind;
  batterOutId: string;
  fielderId?: string;
}

export interface BallEvent {
  _id: string;
  createdAt: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  overNumber: number;
  ballInOver: number;
  runsOffBat: number;
  extras: Extras;
  wicket?: WicketInfo;
  notes?: string;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  events: BallEvent[];
  /** Override for super over etc. If set, this innings is limited to this many overs. */
  maxOvers?: number;
  /** Override balls per over for this innings (e.g. super over with 5 or 6 balls). */
  ballsPerOver?: number;
  /** Max wickets before innings ends (e.g. super over = 2). When reached, innings is over even if balls remain. */
  maxWickets?: number;
  /** Super Over: chosen batting order (first two = openers). If set, used instead of team playing XI. */
  battingOrderOverride?: string[];
  /** Super Over: chosen bowler to start the over. If set, used as initial bowler. */
  initialBowlerId?: string;
}

export type TossDecision = "BAT" | "FIELD";
export type MatchStatus = "SETUP" | "IN_PROGRESS" | "COMPLETED";

export interface Match {
  _id: string;
  matchName: string;
  location?: string;
  date: string;
  teamAId: string;
  teamBId: string;
  playingXI_A: string[];
  playingXI_B: string[];
  tossWinnerTeamId: string;
  tossDecision: TossDecision;
  rulesConfig: RulesConfig;
  status: MatchStatus;
  innings: Innings[];
  createdByUserId?: string;
}
