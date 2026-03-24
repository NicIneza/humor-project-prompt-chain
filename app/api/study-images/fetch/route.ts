import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

type FetchStudyImageBody = {
  imageUrl?: unknown;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { user, isAdmin } = await getSessionContext();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as FetchStudyImageBody;
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!imageUrl) {
      return NextResponse.json({ error: "An image URL is required." }, { status: 400 });
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: "The study image URL is invalid." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Only http and https study image URLs are supported." }, { status: 400 });
    }

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: `Unable to download the study image. Remote server returned ${upstreamResponse.status}.` },
        { status: 502 },
      );
    }

    const buffer = await upstreamResponse.arrayBuffer();
    const contentType = upstreamResponse.headers.get("content-type") ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      },
      status: 200,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
