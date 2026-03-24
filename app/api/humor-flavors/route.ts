import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { createHumorFlavor, listHumorFlavors } from "@/lib/humor-flavors";
import { getErrorMessage } from "@/lib/errors";
import { normalizeSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { user, isAdmin, supabase } = await getSessionContext();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const flavors = await listHumorFlavors(supabase);
    return NextResponse.json({ flavors });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { user, isAdmin, supabase } = await getSessionContext();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = (await request.json()) as { description?: unknown; slug?: unknown };
    const slug = typeof body.slug === "string" ? normalizeSlug(body.slug) : "";
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;

    if (!slug) {
      return NextResponse.json({ error: "A humor flavor slug is required." }, { status: 400 });
    }

    const flavor = await createHumorFlavor(supabase, {
      description,
      slug,
      userId: user.id,
    });

    return NextResponse.json({ flavor }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
