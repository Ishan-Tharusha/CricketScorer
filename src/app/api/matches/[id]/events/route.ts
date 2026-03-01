import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MatchModel } from "@/lib/models";
import { ballEventInputSchema } from "@/lib/validations";
import { ballCounts } from "@/lib/engine";

function nextOverAndBall(events: { extras?: { type: string | null }; wicket?: unknown }[], ballsPerOver: number, rules: { ballsPerOver: number }): { overNumber: number; ballInOver: number } {
  let logicalBalls = 0;
  for (const e of events) {
    if (ballCounts(e as Parameters<typeof ballCounts>[0], rules as Parameters<typeof ballCounts>[1])) logicalBalls += 1;
  }
  const overNumber = Math.floor(logicalBalls / ballsPerOver) + 1;
  const ballInOver = (logicalBalls % ballsPerOver) + 1;
  return { overNumber, ballInOver };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = ballEventInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const match = await MatchModel.findById(id);
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Match is not in progress" }, { status: 400 });
    }
    const inningsIndex = match.innings.length - 1;
    if (inningsIndex < 0 || !match.innings[inningsIndex]) {
      return NextResponse.json({ error: "No active innings" }, { status: 400 });
    }
    const innings = match.innings[inningsIndex];
    const events = innings.events ?? [];
    const bpo = innings.ballsPerOver ?? match.rulesConfig.ballsPerOver;
    const { overNumber, ballInOver } = nextOverAndBall(events, bpo, match.rulesConfig);
    const eventId = new mongoose.Types.ObjectId().toString();
    const event = {
      _id: eventId,
      createdAt: new Date().toISOString(),
      ...parsed.data,
      overNumber,
      ballInOver,
    };
    innings.events = [...events, event];
    await match.save();
    return NextResponse.json({ event, match: match.toObject() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add event" }, { status: 500 });
  }
}
