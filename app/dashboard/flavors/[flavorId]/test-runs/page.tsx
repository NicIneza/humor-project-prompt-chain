import { notFound } from "next/navigation";

import { FlavorTestRuns } from "@/components/flavors/flavor-test-runs";
import { getApiBaseUrl } from "@/lib/config";
import { getHumorFlavorById } from "@/lib/humor-flavors";
import { listStudyImageSets } from "@/lib/study-image-sets";
import { createClient } from "@/lib/supabase/server";
import type { HumorFlavor, StudyImageSet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FlavorTestRunsPage({
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
  let flavor: HumorFlavor;
  let studyImageSets: StudyImageSet[] = [];
  let initialLoadError: string | null = null;

  try {
    flavor = await getHumorFlavorById(supabase, numericFlavorId);
  } catch {
    notFound();
  }

  try {
    studyImageSets = await listStudyImageSets(supabase);
  } catch (error) {
    initialLoadError = error instanceof Error ? error.message : "Unable to load study image sets.";
  }

  return (
    <FlavorTestRuns
      apiBaseUrl={getApiBaseUrl()}
      flavor={flavor}
      initialLoadError={initialLoadError}
      studyImageSets={studyImageSets}
    />
  );
}
