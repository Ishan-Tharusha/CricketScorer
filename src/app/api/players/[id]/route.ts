import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { PlayerModel } from "@/lib/models";
import { playerSchema } from "@/lib/validations";

function sameEmail(a?: string | null, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function canEditPlayer(
  session: { user?: { playerId?: string; role?: string; email?: string | null } } | null,
  playerId: string,
  player?: { createdBy?: string; email?: string } | null
): boolean {
  if (!session?.user) return false;
  const { playerId: myPlayerId, role, email: sessionEmail } = session.user;
  if (role === "admin") return true;
  if (myPlayerId === playerId) return true;
  if (sameEmail(sessionEmail, player?.email)) return true;
  if (player?.createdBy && myPlayerId && player.createdBy === myPlayerId) return true;
  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const player = await PlayerModel.findById(id).lean();
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    return NextResponse.json(player);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch player" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const existing = await PlayerModel.findById(id).select("createdBy email").lean();
    if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    if (!canEditPlayer(session, id, existing)) {
      return NextResponse.json({ error: "You can only edit your own profile, players you created, or need admin role" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = playerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = { ...parsed.data } as Record<string, unknown>;
    if (session.user.role !== "admin" && "role" in data) {
      delete data.role;
    }
    if (body.email === "" || body.email === undefined) {
      delete data.email;
      const player = await PlayerModel.findByIdAndUpdate(
        id,
        { $unset: { email: 1 }, $set: data },
        { new: true }
      ).lean();
      if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
      return NextResponse.json(player);
    }
    const player = await PlayerModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).lean();
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    return NextResponse.json(player);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await connectDB();
    const existing = await PlayerModel.findById(id).select("createdBy email").lean();
    if (!existing) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    if (!canEditPlayer(session, id, existing)) {
      return NextResponse.json({ error: "You can only remove your own profile, players you created, or need admin role" }, { status: 403 });
    }
    const result = await PlayerModel.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete player" }, { status: 500 });
  }
}
