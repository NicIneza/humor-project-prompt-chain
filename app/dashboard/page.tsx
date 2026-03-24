import { FlavorLibrary } from "@/components/flavors/flavor-library";
import { getErrorMessage } from "@/lib/errors";
import { listHumorFlavorSteps } from "@/lib/humor-flavor-steps";
import { listHumorFlavors } from "@/lib/humor-flavors";
import { createClient } from "@/lib/supabase/server";
import type { HumorFlavorListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const loadErrors: string[] = [];

  let flavorItems: HumorFlavorListItem[] = [];

  try {
    const [flavors, steps] = await Promise.all([
      listHumorFlavors(supabase),
      listHumorFlavorSteps(supabase),
    ]);

    flavorItems = flavors.map((flavor) => ({
      ...flavor,
      stepCount: steps.filter((step) => step.flavorId === flavor.id).length,
    }));
  } catch (error) {
    loadErrors.push(getErrorMessage(error));
  }

  return <FlavorLibrary initialFlavors={flavorItems} loadErrors={loadErrors} />;
}
