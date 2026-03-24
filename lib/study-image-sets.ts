import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getImageTableConfig,
  getStudyImageSetMappingTableConfig,
  getStudyImageSetTableConfig,
} from "@/lib/config";
import type { StudyImageSet, StudyImageSetImage } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

function toStringValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function deriveImageName(imageUrl: string | null, imageId: string) {
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

  return `Image ${imageId.slice(0, 8)}`;
}

function normalizeStudyImageSetRow(
  record: UnknownRecord,
  images: StudyImageSetImage[],
) {
  const setConfig = getStudyImageSetTableConfig();

  return {
    createdAt:
      typeof record[setConfig.createdAtColumn] === "string"
        ? (record[setConfig.createdAtColumn] as string)
        : null,
    description:
      typeof record[setConfig.descriptionColumn] === "string"
        ? (record[setConfig.descriptionColumn] as string)
        : null,
    id: Number(record.id),
    imageCount: images.length,
    images,
    slug: String(record[setConfig.slugColumn] ?? ""),
  } satisfies StudyImageSet;
}

export async function listStudyImageSets(supabase: SupabaseClient) {
  const setConfig = getStudyImageSetTableConfig();
  const mappingConfig = getStudyImageSetMappingTableConfig();
  const imageConfig = getImageTableConfig();

  const { data: setData, error: setError } = await supabase
    .from(setConfig.tableName)
    .select(["id", setConfig.createdAtColumn, setConfig.descriptionColumn, setConfig.slugColumn].join(", "))
    .order(setConfig.createdAtColumn, { ascending: false });

  if (setError) {
    throw new Error(`Unable to load study image sets from ${setConfig.tableName}: ${setError.message}`);
  }

  const setRows = ((setData ?? []) as unknown[]).map((row) => row as UnknownRecord);
  const setIds = setRows
    .map((row) => toNumberValue(row.id))
    .filter((value): value is number => typeof value === "number");

  if (setIds.length === 0) {
    return [] as StudyImageSet[];
  }

  const { data: mappingData, error: mappingError } = await supabase
    .from(mappingConfig.tableName)
    .select(
      ["id", mappingConfig.createdAtColumn, mappingConfig.imageIdColumn, mappingConfig.setIdColumn].join(", "),
    )
    .in(mappingConfig.setIdColumn, setIds)
    .order(mappingConfig.createdAtColumn, { ascending: true })
    .order("id", { ascending: true });

  if (mappingError) {
    throw new Error(
      `Unable to load study image set mappings from ${mappingConfig.tableName}: ${mappingError.message}`,
    );
  }

  const mappingRows = ((mappingData ?? []) as unknown[]).map((row) => row as UnknownRecord);
  const imageIds = Array.from(
    new Set(
      mappingRows
        .map((row) => toStringValue(row[mappingConfig.imageIdColumn]))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let imagesById = new Map<string, UnknownRecord>();

  if (imageIds.length > 0) {
    const { data: imageData, error: imageError } = await supabase
      .from(imageConfig.tableName)
      .select(["id", imageConfig.urlColumn].join(", "))
      .in("id", imageIds);

    if (imageError) {
      throw new Error(`Unable to load study set images from ${imageConfig.tableName}: ${imageError.message}`);
    }

    imagesById = new Map(
      ((imageData ?? []) as unknown[])
        .map((row) => row as UnknownRecord)
        .map((image) => {
          const imageId = toStringValue(image.id);
          return imageId ? ([imageId, image] as const) : null;
        })
        .filter((entry): entry is readonly [string, UnknownRecord] => entry != null),
    );
  }

  const mappingsBySetId = new Map<number, StudyImageSetImage[]>();

  for (const mapping of mappingRows) {
    const setId = toNumberValue(mapping[mappingConfig.setIdColumn]);
    const imageId = toStringValue(mapping[mappingConfig.imageIdColumn]);

    if (setId == null || !imageId) {
      continue;
    }

    const image = imagesById.get(imageId);
    const imageUrl = image ? toStringValue(image[imageConfig.urlColumn]) : null;
    const existingImages = mappingsBySetId.get(setId) ?? [];

    existingImages.push({
      id: imageId,
      imageName: deriveImageName(imageUrl, imageId),
      imageUrl,
    });

    mappingsBySetId.set(setId, existingImages);
  }

  return setRows.map((row) => {
    const setId = toNumberValue(row.id) ?? 0;
    return normalizeStudyImageSetRow(row, mappingsBySetId.get(setId) ?? []);
  });
}
