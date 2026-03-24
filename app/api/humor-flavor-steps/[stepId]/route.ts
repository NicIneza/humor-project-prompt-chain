import { NextRequest, NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  deleteHumorFlavorStep,
  updateHumorFlavorStep,
} from "@/lib/humor-flavor-steps";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

function parseInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function parseTemperature(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function PATCH(
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

    const body = (await request.json()) as {
      description?: unknown;
      inputTypeId?: unknown;
      modelId?: unknown;
      outputTypeId?: unknown;
      stepTypeId?: unknown;
      systemPrompt?: unknown;
      temperature?: unknown;
      userPrompt?: unknown;
    };

    const stepTypeId = parseInteger(body.stepTypeId);
    const inputTypeId = parseInteger(body.inputTypeId);
    const outputTypeId = parseInteger(body.outputTypeId);
    const modelId = parseInteger(body.modelId);
    const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt : "";
    const userPrompt = typeof body.userPrompt === "string" ? body.userPrompt : "";
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;

    if (!stepTypeId || !inputTypeId || !outputTypeId || !modelId) {
      return NextResponse.json(
        { error: "Step type, input type, output type, and model are required." },
        { status: 400 },
      );
    }

    const step = await updateHumorFlavorStep(supabase, numericStepId, {
      description,
      inputTypeId,
      modelId,
      outputTypeId,
      stepTypeId,
      systemPrompt,
      temperature: parseTemperature(body.temperature),
      userPrompt,
    });

    return NextResponse.json({ step });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const result = await deleteHumorFlavorStep(supabase, numericStepId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
