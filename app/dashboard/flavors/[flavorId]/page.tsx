import { notFound } from "next/navigation";

import { FlavorDetail } from "@/components/flavors/flavor-detail";
import { getErrorMessage } from "@/lib/errors";
import { listHumorFlavorStepsForFlavor } from "@/lib/humor-flavor-steps";
import { getHumorFlavorById } from "@/lib/humor-flavors";
import { createClient } from "@/lib/supabase/server";
import { listStepCatalog } from "@/lib/step-catalog";
import type { HumorFlavor, HumorFlavorStep, StepCatalog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FlavorDetailPage({
  params,
}: {
  params: Promise<{ flavorId: string }>;
}) {
  const { flavorId } = await params;
  const numericFlavorId = Number(flavorId);

  if (!Number.isInteger(numericFlavorId)) {
    notFound();
  }

  const supabase = await createClient();
  const loadErrors: string[] = [];

  let flavor: HumorFlavor;

  try {
    flavor = await getHumorFlavorById(supabase, numericFlavorId);
  } catch {
    notFound();
  }

  let steps: HumorFlavorStep[] = [];
  let catalog: StepCatalog = {
    inputTypes: [],
    models: [],
    outputTypes: [],
    stepTypes: [],
  };

  try {
    steps = await listHumorFlavorStepsForFlavor(supabase, numericFlavorId);
  } catch (error) {
    loadErrors.push(getErrorMessage(error));
  }

  try {
    catalog = await listStepCatalog(supabase);
  } catch (error) {
    loadErrors.push(getErrorMessage(error));
  }

  return (
    <FlavorDetail
      initialCatalog={catalog}
      initialFlavor={flavor}
      initialSteps={steps}
      loadErrors={loadErrors}
    />
  );
}
