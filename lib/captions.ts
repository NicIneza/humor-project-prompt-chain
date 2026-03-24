import type { SupabaseClient } from "@supabase/supabase-js";

import { getCaptionTableConfig, getImageTableConfig } from "@/lib/config";
import type { CachedCaption } from "@/lib/types";

type CaptionRecord = Record<string, unknown>;
type ImageRecord = Record<string, unknown>;

export type CaptionHistoryPage = {
  captions: CachedCaption[];
  page: number;
  pageSize: number;
  totalCount: number;
};

function toStringValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function deriveImageName(imageUrl: string | null, imageId: string | null) {
  if (imageUrl) {
    try {
      const pathname = new URL(imageUrl).pathname;
      const lastSegment = pathname.split("/").filter(Boolean).at(-1);

      if (lastSegment) {
        return decodeURIComponent(lastSegment);
      }
    } catch {
      const fallback = imageUrl.split("/").filter(Boolean).at(-1);

      if (fallback) {
        return decodeURIComponent(fallback);
      }
    }
  }

  if (imageId) {
    return `Image ${imageId.slice(0, 8)}`;
  }

  return "Uploaded image";
}

export async function listCaptionHistoryForFlavor(
  supabase: SupabaseClient,
  flavorId: number,
  flavorSlug: string,
  page = 1,
  pageSize = 24,
) {
  const captionConfig = getCaptionTableConfig();
  const imageConfig = getImageTableConfig();
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const { count, data, error } = await supabase
    .from(captionConfig.tableName)
    .select(
      [
        "id",
        captionConfig.createdAtColumn,
        captionConfig.contentColumn,
        captionConfig.imageIdColumn,
        captionConfig.flavorIdColumn,
        captionConfig.captionRequestIdColumn,
        captionConfig.llmPromptChainIdColumn,
      ].join(", "),
      { count: "exact" },
    )
    .eq(captionConfig.flavorIdColumn, flavorId)
    .order(captionConfig.createdAtColumn, { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to load caption history from ${captionConfig.tableName}: ${error.message}`);
  }

  const rows = ((data ?? []) as unknown as CaptionRecord[]).filter(Boolean);
  const imageIds = Array.from(
    new Set(
      rows
        .map((row) => toStringValue(row[captionConfig.imageIdColumn]))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let imagesById = new Map<string, ImageRecord>();

  if (imageIds.length > 0) {
    const { data: imageData, error: imageError } = await supabase
      .from(imageConfig.tableName)
      .select(["id", imageConfig.urlColumn].join(", "))
      .in("id", imageIds);

    if (imageError) {
      throw new Error(`Unable to load images from ${imageConfig.tableName}: ${imageError.message}`);
    }

    imagesById = new Map(
      ((imageData ?? []) as unknown as ImageRecord[])
        .map((image) => {
          const id = toStringValue(image.id);
          return id ? ([id, image] as const) : null;
        })
        .filter((entry): entry is readonly [string, ImageRecord] => entry != null),
    );
  }

  const captions = rows.map((row) => {
    const imageId = toStringValue(row[captionConfig.imageIdColumn]);
    const image = imageId ? imagesById.get(imageId) ?? null : null;
    const imageUrl = image ? toStringValue(image[imageConfig.urlColumn]) : null;
    const createdAt = toStringValue(row[captionConfig.createdAtColumn]) ?? new Date().toISOString();
    const content = toStringValue(row[captionConfig.contentColumn]);
    const captionId = toStringValue(row.id) ?? `${flavorId}-${createdAt}`;

    return {
      captionRequestId: toStringValue(row[captionConfig.captionRequestIdColumn]),
      captionText: content,
      createdAt,
      flavorId,
      flavorSlug,
      id: captionId,
      imageId,
      imageName: deriveImageName(imageUrl, imageId),
      imageUrl,
      llmPromptChainId: toStringValue(row[captionConfig.llmPromptChainIdColumn]),
      rawResponse: {
        caption: row,
        image,
      },
      runId: toStringValue(row[captionConfig.captionRequestIdColumn]) ?? `history-${captionId}`,
    } satisfies CachedCaption;
  });

  return {
    captions,
    page: safePage,
    pageSize: safePageSize,
    totalCount: count ?? captions.length,
  } satisfies CaptionHistoryPage;
}
