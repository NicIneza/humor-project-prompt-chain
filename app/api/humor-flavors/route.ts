import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";
import {
  getHumorFlavorPresetBySlug,
  resolveHumorFlavorPresetSteps,
} from "@/lib/flavor-presets";
import { createHumorFlavorStep } from "@/lib/humor-flavor-steps";
import { createHumorFlavor, deleteHumorFlavor, listHumorFlavors } from "@/lib/humor-flavors";
import { normalizeSlug } from "@/lib/slugs";
import { listStepCatalog } from "@/lib/step-catalog";

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

    const body = (await request.json()) as {
      description?: unknown;
      presetSlug?: unknown;
      slug?: unknown;
    };
    const presetSlug = typeof body.presetSlug === "string" ? normalizeSlug(body.presetSlug) : "";
    const preset = presetSlug ? getHumorFlavorPresetBySlug(presetSlug) : null;
    const slug =
      typeof body.slug === "string" && normalizeSlug(body.slug)
        ? normalizeSlug(body.slug)
        : preset?.slug ?? "";
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : preset?.flavorDescription ?? null;

    if (!slug) {
      return NextResponse.json({ error: "A humor flavor slug is required." }, { status: 400 });
    }

    if (presetSlug && !preset) {
      return NextResponse.json({ error: "Unknown humor flavor preset." }, { status: 400 });
    }

    const flavor = await createHumorFlavor(supabase, {
      description,
      slug,
      userId: user.id,
    });

    try {
      let createdStepCount = 0;

      if (preset) {
        const catalog = await listStepCatalog(supabase);
        const presetSteps = resolveHumorFlavorPresetSteps(catalog, preset);

        for (const step of presetSteps) {
          await createHumorFlavorStep(supabase, flavor.id, step);
        }

        createdStepCount = presetSteps.length;
      }

      return NextResponse.json(
        {
          appliedPresetSlug: preset?.slug ?? null,
          createdStepCount,
          flavor,
        },
        { status: 201 },
      );
    } catch (error) {
      await deleteHumorFlavor(supabase, flavor.id).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
