import { NextRequest, NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";
import { moveHumorFlavorStep } from "@/lib/humor-flavor-steps";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { stepId } = await params;
    const numericStepId = Number(stepId);
    const { user, isAdmin, supabase } = await getSessionContext();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!Number.isInteger(numericStepId)) {
      return NextResponse.json({ error: "Invalid humor flavor step id." }, { status: 400 });
    }

    const body = (await request.json()) as { direction?: unknown };
    const direction = body.direction === "up" || body.direction === "down" ? body.direction : null;

    if (!direction) {
      return NextResponse.json({ error: "A move direction is required." }, { status: 400 });
    }

    const result = await moveHumorFlavorStep(supabase, numericStepId, direction);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
