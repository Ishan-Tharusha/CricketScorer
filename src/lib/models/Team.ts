import mongoose, { Schema, model, models } from "mongoose";
import type { Team as ITeam } from "@/lib/types";

const TeamSchema = new Schema<ITeam>(
  {
    teamName: { type: String, required: true },
    playerIds: [{ type: String, ref: "Player" }],
    defaultPlayingXIIds: [String],
  },
  { timestamps: true }
);

TeamSchema.index({ teamName: 1 });

export const TeamModel = models.Team ?? model<ITeam>("Team", TeamSchema);
