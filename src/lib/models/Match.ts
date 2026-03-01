import mongoose, { Schema, model, models } from "mongoose";
import type { Match as IMatch, BallEvent, Innings, RulesConfig } from "@/lib/types";

const ExtrasSchema = new Schema(
  {
    type: { type: String, enum: ["WD", "NB", "B", "LB"], default: null },
    runs: { type: Number, default: 0 },
  },
  { _id: false }
);

const WicketInfoSchema = new Schema(
  {
    kind: {
      type: String,
      enum: ["BOWLED", "CAUGHT", "LBW", "RUN_OUT", "STUMPED", "HIT_WICKET", "RETIRED"],
    },
    batterOutId: String,
    fielderId: String,
  },
  { _id: false }
);

const BallEventSchema = new Schema<BallEvent>(
  {
    _id: { type: String, required: true },
    createdAt: { type: String, required: true },
    strikerId: String,
    nonStrikerId: String,
    bowlerId: String,
    overNumber: Number,
    ballInOver: Number,
    runsOffBat: Number,
    extras: ExtrasSchema,
    wicket: WicketInfoSchema,
    notes: String,
  },
  { _id: false }
);

const InningsSchema = new Schema<Innings>(
  {
    battingTeamId: String,
    bowlingTeamId: String,
    events: [BallEventSchema],
    maxOvers: Number,
    ballsPerOver: Number,
    maxWickets: Number,
    battingOrderOverride: [String],
    initialBowlerId: String,
  },
  { _id: false }
);

const RulesConfigSchema = new Schema<RulesConfig>(
  {
    oversPerInnings: Number,
    ballsPerOver: Number,
    maxOversPerBowler: Number,
    wideRuns: Number,
    noBallRuns: Number,
    wideCountsAsBall: Boolean,
    noBallCountsAsBall: Boolean,
    lastManStandingRule: Boolean,
  },
  { _id: false }
);

const MatchSchema = new Schema<IMatch>(
  {
    matchName: { type: String, required: true },
    location: String,
    date: { type: String, required: true },
    teamAId: { type: String, ref: "Team" },
    teamBId: { type: String, ref: "Team" },
    playingXI_A: [String],
    playingXI_B: [String],
    tossWinnerTeamId: String,
    tossDecision: { type: String, enum: ["BAT", "FIELD"] },
    rulesConfig: RulesConfigSchema,
    status: { type: String, enum: ["SETUP", "IN_PROGRESS", "COMPLETED"], default: "SETUP" },
    innings: [InningsSchema],
    createdByUserId: String,
  },
  { timestamps: true }
);

MatchSchema.index({ date: -1, status: 1 });
MatchSchema.index({ createdByUserId: 1 });

export const MatchModel = models.Match ?? model<IMatch>("Match", MatchSchema);
