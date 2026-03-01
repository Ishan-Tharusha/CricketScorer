import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { PlayerModel, MatchModel } from "@/lib/models";
import { playerSchema } from "@/lib/validations";
import { computePlayerStats } from "@/lib/playerStats";
import type { MatchForStats } from "@/lib/playerStats";

export async function GET(request: Request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? "";
    const withStats = url.searchParams.get("withStats") === "1";
    const light = url.searchParams.get("light") === "1";

    const query = typeof search === "string" && search.trim()
      ? { fullName: new RegExp(search.trim(), "i") }
      : {};
    const players = light
      ? await PlayerModel.find(query).select("_id fullName shortName").lean()
      : await PlayerModel.find(query).lean();

    if (withStats && !light && players.length > 0) {
      const matches = await MatchModel.find({
        status: { $in: ["IN_PROGRESS", "COMPLETED"] },
      })
        .lean()
        .exec();
      const matchesForStats = matches as unknown as MatchForStats[];
      const withStatsList = players.map((p) => {
        const stats = computePlayerStats(String(p._id), matchesForStats);
        return {
          ...p,
          stats: {
            matchesPlayed: stats.matchesPlayed,
            runs: stats.batting.runs,
            strikeRate: stats.batting.strikeRate,
            wickets: stats.bowling.wickets,
          },
        };
      });
      return NextResponse.json(withStatsList);
    }

    return NextResponse.json(players);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.playerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = playerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const player = await PlayerModel.create({
      ...parsed.data,
      _id: new (await import("mongoose")).Types.ObjectId().toString(),
      createdBy: session.user.playerId,
    });
    return NextResponse.json(player.toObject());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
  }
}
