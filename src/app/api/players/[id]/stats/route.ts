import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MatchModel, PlayerModel } from "@/lib/models";
import { computePlayerStats } from "@/lib/playerStats";
import type { MatchForStats } from "@/lib/playerStats";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;
    await connectDB();

    const player = await PlayerModel.findById(playerId).lean();
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    const matches = await MatchModel.find({
      status: { $in: ["IN_PROGRESS", "COMPLETED"] },
      $or: [{ playingXI_A: playerId }, { playingXI_B: playerId }],
    })
      .lean()
      .exec();

    const stats = computePlayerStats(playerId, matches as unknown as MatchForStats[]);

    return NextResponse.json({
      matchesPlayed: stats.matchesPlayed,
      batting: stats.batting,
      bowling: stats.bowling,
      runsPerInnings: stats.runsPerInnings,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch player stats" }, { status: 500 });
  }
}
