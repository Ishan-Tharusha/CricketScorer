import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { MatchModel } from "@/lib/models";
import { matchSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const match = await MatchModel.findById(id).lean();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    return NextResponse.json(match);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const existing = await MatchModel.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    if (existing.createdByUserId && existing.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "Only the match creator can edit this match" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = matchSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const match = await MatchModel.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true }
    ).lean();
    if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
    return NextResponse.json(match);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}
