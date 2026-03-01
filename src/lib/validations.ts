import { z } from "zod";

export const playerSchema = z.object({
  fullName: z.string().min(1),
  shortName: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional().transform((s) => (s === "" ? undefined : s)),
  battingStyle: z.enum(["RIGHT", "LEFT"]).optional(),
  bowlingStyle: z.string().optional(),
  isKeeper: z.boolean().optional(),
  role: z.enum(["player", "admin"]).optional(),
});

export const teamSchema = z.object({
  teamName: z.string().min(1),
  playerIds: z.array(z.string()),
  defaultPlayingXIIds: z.array(z.string()).optional(),
});

export const rulesConfigSchema = z.object({
  oversPerInnings: z.number().min(1),
  ballsPerOver: z.number().refine((n) => [4, 5, 6, 8].includes(n)),
  maxOversPerBowler: z.number().min(1).optional(),
  wideRuns: z.number().min(0),
  noBallRuns: z.number().min(0),
  wideCountsAsBall: z.boolean(),
  noBallCountsAsBall: z.boolean(),
  lastManStandingRule: z.boolean().optional(),
});

const extrasSchema = z.object({
  type: z.enum(["WD", "NB", "B", "LB"]).nullable(),
  runs: z.number().min(0),
});
const wicketSchema = z.object({
  kind: z.enum(["BOWLED", "CAUGHT", "LBW", "RUN_OUT", "STUMPED", "HIT_WICKET", "RETIRED"]),
  batterOutId: z.string(),
  fielderId: z.string().optional(),
});

export const ballEventSchema = z.object({
  strikerId: z.string(),
  nonStrikerId: z.string(),
  bowlerId: z.string(),
  overNumber: z.number().min(1).optional(),
  ballInOver: z.number().min(1).optional(),
  runsOffBat: z.number().min(0).max(6),
  extras: extrasSchema,
  wicket: wicketSchema.optional(),
  notes: z.string().optional(),
});

/** Client sends this; server can compute overNumber/ballInOver. */
export const ballEventInputSchema = z.object({
  strikerId: z.string(),
  nonStrikerId: z.string(),
  bowlerId: z.string(),
  runsOffBat: z.number().min(0).max(6),
  extras: extrasSchema,
  wicket: wicketSchema.optional(),
  notes: z.string().optional(),
});

const inningsSchemaZ = z.object({
  battingTeamId: z.string(),
  bowlingTeamId: z.string(),
  events: z.array(z.any()).default([]),
  maxOvers: z.number().min(1).optional(),
  ballsPerOver: z.number().min(4).max(8).optional(),
  maxWickets: z.number().min(1).optional(),
  battingOrderOverride: z.array(z.string()).optional(),
  initialBowlerId: z.string().optional(),
});

export const matchSchema = z.object({
  matchName: z.string().min(1),
  location: z.string().optional(),
  date: z.string(),
  teamAId: z.string(),
  teamBId: z.string(),
  playingXI_A: z.array(z.string()),
  playingXI_B: z.array(z.string()),
  tossWinnerTeamId: z.string(),
  tossDecision: z.enum(["BAT", "FIELD"]),
  rulesConfig: rulesConfigSchema,
  status: z.enum(["SETUP", "IN_PROGRESS", "COMPLETED"]).optional(),
  innings: z.array(inningsSchemaZ).optional(),
});

/** For creating match shell; then PATCH to add setup. */
export const createMatchSchema = z.object({
  matchName: z.string().min(1),
  location: z.string().optional(),
  date: z.string(),
  teamAId: z.string(),
  teamBId: z.string(),
  playingXI_A: z.array(z.string()).default([]),
  playingXI_B: z.array(z.string()).default([]),
  tossWinnerTeamId: z.string().optional(),
  tossDecision: z.enum(["BAT", "FIELD"]).optional(),
  rulesConfig: rulesConfigSchema,
  status: z.enum(["SETUP", "IN_PROGRESS", "COMPLETED"]).optional(),
  innings: z.array(inningsSchemaZ).optional(),
  createdByUserId: z.string().optional(),
});
