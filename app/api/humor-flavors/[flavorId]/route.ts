import { NextRequest, NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { deleteHumorFlavor, updateHumorFlavor } from "@/lib/humor-flavors";
import { getErrorMessage } from "@/lib/errors";
import { normalizeSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flavorId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { flavorId } = await params;
    const numericFlavorId = Number(flavorId);
    const { user, isAdmin, supabase } = await getSessionContext();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!Number.isInteger(numericFlavorId)) {
      return NextResponse.json({ error: "Invalid humor flavor id." }, { status: 400 });
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

    const flavor = await updateHumorFlavor(supabase, numericFlavorId, {
      description,
      slug,
    });

    return NextResponse.json({ flavor });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ flavorId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { flavorId } = await params;
    const numericFlavorId = Number(flavorId);
    const { user, isAdmin, supabase } = await getSessionContext();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!Number.isInteger(numericFlavorId)) {
      return NextResponse.json({ error: "Invalid humor flavor id." }, { status: 400 });
    }

    await deleteHumorFlavor(supabase, numericFlavorId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
