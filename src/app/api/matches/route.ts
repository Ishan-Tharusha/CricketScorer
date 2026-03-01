import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MatchModel } from "@/lib/models";
import { createMatchSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const forUser = url.searchParams.get("forUser") ?? undefined;
    const forPlayer = url.searchParams.get("forPlayer") ?? undefined;
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (forUser || forPlayer) {
      const or: Record<string, unknown>[] = [];
      if (forUser) or.push({ createdByUserId: forUser });
      if (forPlayer) {
        or.push({ playingXI_A: forPlayer });
        or.push({ playingXI_B: forPlayer });
      }
      query.$or = or;
    }

    const [matches, total] = await Promise.all([
      MatchModel.find(query).sort({ date: -1, updatedAt: -1 }).skip(skip).limit(limit).lean(),
      MatchModel.countDocuments(query),
    ]);
    return NextResponse.json({ matches, total });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const match = await MatchModel.create({
      ...parsed.data,
      status: parsed.data.status ?? "SETUP",
      innings: parsed.data.innings ?? [],
      createdByUserId: parsed.data.createdByUserId ?? undefined,
      _id: new (await import("mongoose")).Types.ObjectId().toString(),
    });
    return NextResponse.json(match.toObject());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 });
  }
}
