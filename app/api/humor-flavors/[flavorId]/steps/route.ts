import { NextRequest, NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  createHumorFlavorStep,
  listHumorFlavorStepsForFlavor,
} from "@/lib/humor-flavor-steps";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

function parseInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function parseTemperature(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(
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

    const steps = await listHumorFlavorStepsForFlavor(supabase, numericFlavorId);
    return NextResponse.json({ steps });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
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

    const step = await createHumorFlavorStep(supabase, numericFlavorId, {
      description,
      inputTypeId,
      modelId,
      outputTypeId,
      stepTypeId,
      systemPrompt,
      temperature: parseTemperature(body.temperature),
      userPrompt,
    });

    return NextResponse.json({ step }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
