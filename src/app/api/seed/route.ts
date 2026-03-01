import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PlayerModel, TeamModel } from "@/lib/models";

export const dynamic = "force-dynamic";

/** Optional: seed demo data. GET /api/seed */
export async function GET() {
  try {
    await connectDB();
    const existing = await PlayerModel.countDocuments();
    if (existing > 0) {
      return NextResponse.json({ message: "Data exists, skip seed", count: existing });
    }
    const names = [
      "Avishka Chanaka", "Anjula Nirmala", "Kalana Madawa", "Sasanka Tharaka", "Ishan Tharusha",
      "Sanjeew Lakmal", "Viraj Dananjaya", "Waniia Ayya",
      "Dinesh Perera", "Nuwan Fernando", "Chaminda Silva", "Roshan Gunasekara", "Mahesh Jayawardene",
      "Suresh Mendis", "Ramesh De Silva", "Kumar Wickramasinghe", "Asela Gunaratne", "Dimuth Karunaratne",
      "Kusal Mendis", "Pathum Nissanka", "Charith Asalanka", "Dasun Shanaka",
    ];
    const players = await PlayerModel.insertMany(
      names.map((fullName) => ({
        fullName,
        shortName: fullName.split(" ").map((n) => n[0]).join("."),
      }))
    );
    const ids = players.map((p) => p._id.toString());
    await TeamModel.insertMany([
      { teamName: "Tigers XI", playerIds: ids.slice(0, 11) },
      { teamName: "Lions XI", playerIds: ids.slice(11, 22) },
    ]);
    return NextResponse.json({ message: "Seeded", players: players.length, teams: 2 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
