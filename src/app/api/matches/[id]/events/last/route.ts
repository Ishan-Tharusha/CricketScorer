import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MatchModel } from "@/lib/models";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    if (!innings.events?.length) {
      return NextResponse.json({ error: "No balls to undo" }, { status: 400 });
    }
    innings.events.pop();
    await match.save();
    return NextResponse.json({ match: match.toObject() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to undo last ball" }, { status: 500 });
  }
}
