import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/** Serves the login background image so it always loads (avoids static serve issues). GET /api/bg */
export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const webpPath = path.join(publicDir, "bg.webp");
    const pngPath = path.join(publicDir, "bg.png");

    let buffer: Buffer;
    let contentType: string;

    try {
      buffer = await readFile(webpPath);
      contentType = "image/webp";
    } catch {
      buffer = await readFile(pngPath);
      contentType = "image/png";
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[api/bg]", e);
    return new NextResponse(null, { status: 404 });
  }
}
