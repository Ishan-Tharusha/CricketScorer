import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TeamModel } from "@/lib/models";
import { teamSchema } from "@/lib/validations";

export async function GET() {
  try {
    await connectDB();
    const teams = await TeamModel.find().lean();
    return NextResponse.json(teams);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const team = await TeamModel.create({
      ...parsed.data,
      _id: new (await import("mongoose")).Types.ObjectId().toString(),
    });
    return NextResponse.json(team.toObject());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
