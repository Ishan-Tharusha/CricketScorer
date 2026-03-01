import mongoose, { Schema, model, models } from "mongoose";
import type { Player as IPlayer } from "@/lib/types";

const PlayerSchema = new Schema<IPlayer>(
  {
    fullName: { type: String, required: true },
    shortName: String,
    email: String,
    battingStyle: String,
    bowlingStyle: String,
    isKeeper: { type: Boolean, default: false },
    role: { type: String, enum: ["player", "admin"], default: "player" },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const PlayerModel = models.Player ?? model<IPlayer>("Player", PlayerSchema);
