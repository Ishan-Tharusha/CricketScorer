import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MatchModel, TeamModel } from "@/lib/models";
import { computeInningsSummary } from "@/lib/engine";
import type { BallEvent, RulesConfig } from "@/lib/types";
import { DEFAULT_RULES } from "@/lib/types";

/** Get winner teamId from match (null if tie). Uses first two innings for normal match, last two for super over. */
function getWinnerTeamId(match: { innings?: { battingTeamId: string; bowlingTeamId: string; events: BallEvent[]; ballsPerOver?: number }[]; rulesConfig?: RulesConfig }): string | null {
  const inns = match.innings ?? [];
  if (inns.length < 2) return null;
  const rules: RulesConfig = { ...DEFAULT_RULES, ...(match.rulesConfig ?? {}) };
  const isSO = inns.length >= 4 && inns[inns.length - 1]?.battingTeamId;
  const first = isSO ? inns[inns.length - 2]! : inns[0]!;
  const second = isSO ? inns[inns.length - 1]! : inns[1]!;
  const bpo1 = first.ballsPerOver ?? rules.ballsPerOver;
  const bpo2 = second.ballsPerOver ?? rules.ballsPerOver;
  const r1 = computeInningsSummary(first.events ?? [], rules, bpo1).totalRuns;
  const r2 = computeInningsSummary(second.events ?? [], rules, bpo2).totalRuns;
  if (r2 > r1) return second.battingTeamId;
  if (r1 > r2) return first.battingTeamId;
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    await connectDB();

    const team = await TeamModel.findById(teamId).lean();
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const matches = await MatchModel.find({
      status: { $in: ["IN_PROGRESS", "COMPLETED"] },
      $or: [{ teamAId: teamId }, { teamBId: teamId }],
    })
      .lean()
      .exec();

    let winCount = 0;
    for (const m of matches) {
      const winnerId = getWinnerTeamId(m as Parameters<typeof getWinnerTeamId>[0]);
      if (winnerId === teamId) winCount += 1;
    }

    return NextResponse.json({
      matchCount: matches.length,
      winCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch team stats" }, { status: 500 });
  }
}
