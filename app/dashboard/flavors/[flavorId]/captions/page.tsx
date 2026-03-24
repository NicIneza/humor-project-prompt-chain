import { notFound } from "next/navigation";

import { FlavorCaptions } from "@/components/flavors/flavor-captions";
import { listCaptionHistoryForFlavor } from "@/lib/captions";
import { getApiBaseUrl } from "@/lib/config";
import { getHumorFlavorById } from "@/lib/humor-flavors";
import { createClient } from "@/lib/supabase/server";
import type { CachedCaption, HumorFlavor } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 6;

export default async function FlavorCaptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ flavorId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { flavorId } = await params;
  const { page: pageParam } = await searchParams;
  const numericFlavorId = Number(flavorId);
  const pageValue = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const currentPage = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);

  if (!Number.isInteger(numericFlavorId)) {
    notFound();
  }

  const supabase = await createClient();
  let flavor: HumorFlavor;
  let initialCaptions: CachedCaption[] = [];
  let initialLoadError: string | null = null;
  let totalCount = 0;

  try {
    flavor = await getHumorFlavorById(supabase, numericFlavorId);
  } catch {
    notFound();
  }

  try {
    const historyPage = await listCaptionHistoryForFlavor(
      supabase,
      numericFlavorId,
      flavor.slug,
      currentPage,
      PAGE_SIZE,
    );

    initialCaptions = historyPage.captions;
    totalCount = historyPage.totalCount;
  } catch (error) {
    initialLoadError = error instanceof Error ? error.message : "Unable to load caption history.";
  }

  return (
    <FlavorCaptions
      apiBaseUrl={getApiBaseUrl()}
      currentPage={currentPage}
      flavor={flavor}
      initialCaptions={initialCaptions}
      initialLoadError={initialLoadError}
      pageSize={PAGE_SIZE}
      totalCount={totalCount}
    />
  );
}
