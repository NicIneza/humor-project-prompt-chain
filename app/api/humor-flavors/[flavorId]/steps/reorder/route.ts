import { NextRequest, NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";
import { reorderHumorFlavorSteps } from "@/lib/humor-flavor-steps";

export const dynamic = "force-dynamic";

function parseStepIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry));
}

export async function POST(
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

    const body = (await request.json()) as { stepIds?: unknown };
    const stepIds = parseStepIds(body.stepIds);

    if (stepIds.length === 0) {
      return NextResponse.json({ error: "A full ordered list of step ids is required." }, { status: 400 });
    }

    const result = await reorderHumorFlavorSteps(supabase, numericFlavorId, stepIds);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
