import type { NextRequest } from "next/server";
import { searchAccompaniments } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  const song = request.nextUrl.searchParams.get("song")?.trim();

  if (!song) {
    return Response.json(
      { error: "Enter the name of a song." },
      { status: 400 },
    );
  }

  // Bias the query toward playable piano accompaniment tracks — the kind a
  // player practices along to, not full performances.
  const query = `${song} piano accompaniment backing track`;

  try {
    const results = await searchAccompaniments(query);
    return Response.json({ song, results });
  } catch {
    return Response.json(
      { error: "Couldn't reach YouTube right now. Try again in a moment." },
      { status: 502 },
    );
  }
}
