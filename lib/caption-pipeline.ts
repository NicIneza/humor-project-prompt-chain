import type { CachedCaption } from "@/lib/types";

type CaptionPipelineParams = {
  accessToken: string;
  apiBaseUrl: string;
  file: File;
  flavorId: number;
  flavorSlug: string;
  onStatus?: (status: "generating" | "registering", context: { imageId: string | null; imageUrl: string | null }) => void;
  runCreatedAt: string;
  runId: string;
};

type ExistingImageCaptionPipelineParams = {
  accessToken: string;
  apiBaseUrl: string;
  flavorId: number;
  flavorSlug: string;
  imageId: string;
  imageName: string;
  imageUrl: string | null;
  onStatus?: (
    status: "generating" | "registering",
    context: { imageId: string | null; imageUrl: string | null },
  ) => void;
  runCreatedAt: string;
  runId: string;
};

type UnknownRecord = Record<string, unknown>;

export type CaptionPipelineResult = {
  captionEntries: CachedCaption[];
  imageId: string;
  imageUrl: string | null;
};

export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/heic",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function generateClientId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toObject(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function findStringLike(
  value: unknown,
  targetKeys: string[],
  depth = 0,
  matchedKey = false,
): string | null {
  if (depth > 4 || value == null) {
    return null;
  }

  if (typeof value === "string" && matchedKey) {
    return value;
  }

  if ((typeof value === "number" || typeof value === "boolean") && matchedKey) {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findStringLike(entry, targetKeys, depth + 1, matchedKey);
      if (match) {
        return match;
      }
    }

    return null;
  }

  const record = toObject(value);

  if (!record) {
    return null;
  }

  for (const [key, entry] of Object.entries(record)) {
    if (targetKeys.includes(key)) {
      const match = findStringLike(entry, targetKeys, depth + 1, true);
      if (match) {
        return match;
      }
    }
  }

  for (const entry of Object.values(record)) {
    const match = findStringLike(entry, targetKeys, depth + 1, false);
    if (match) {
      return match;
    }
  }

  return null;
}

function getCaptionRecords(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toObject(payload);

  if (!record) {
    return [];
  }

  if (Array.isArray(record.data)) {
    return record.data;
  }

  if (Array.isArray(record.captions)) {
    return record.captions;
  }

  return [payload];
}

function getRequestFailureMessage(payload: unknown, response: Response, fallbackLabel: string) {
  const record = toObject(payload);

  const prioritizedKeys = [
    "message",
    "detail",
    "details",
    "reason",
    "error_description",
    "errorDescription",
    "title",
  ];

  for (const key of prioritizedKeys) {
    const message = findStringLike(payload, [key]);

    if (message && message !== "true" && message !== "false") {
      return `${fallbackLabel}: ${message}`;
    }
  }

  if (record && typeof record.error === "string" && record.error.trim()) {
    return `${fallbackLabel}: ${record.error.trim()}`;
  }

  if (record && record.error === true) {
    return `${fallbackLabel}: upstream returned error=true with status ${response.status}.`;
  }

  if (typeof payload === "string" && payload.trim()) {
    return `${fallbackLabel}: ${payload.trim()}`;
  }

  return `${fallbackLabel}: request failed with status ${response.status}.`;
}

function mapGeneratedCaptions({
  flavorId,
  flavorSlug,
  generatedCaptions,
  imageId,
  imageName,
  imageUrl,
  runCreatedAt,
  runId,
}: {
  flavorId: number;
  flavorSlug: string;
  generatedCaptions: unknown;
  imageId: string;
  imageName: string;
  imageUrl: string | null;
  runCreatedAt: string;
  runId: string;
}) {
  return getCaptionRecords(generatedCaptions).map((record) => ({
    captionRequestId: findStringLike(record, ["caption_request_id", "captionRequestId"]),
    captionText: findStringLike(record, [
      "caption",
      "caption_text",
      "captionText",
      "content",
      "final_caption",
      "finalCaption",
      "generated_caption",
      "generatedCaption",
      "text",
    ]),
    createdAt:
      findStringLike(record, ["created_at", "created_datetime_utc", "createdAt", "generatedAt"]) ??
      runCreatedAt,
    flavorId,
    flavorSlug,
    id: generateClientId(),
    imageId: findStringLike(record, ["image_id", "imageId"]) ?? imageId,
    imageName,
    imageUrl,
    llmPromptChainId: findStringLike(record, ["llm_prompt_chain_id", "llmPromptChainId"]),
    rawResponse: record,
    runId,
  })) satisfies CachedCaption[];
}

async function requestJson<T>(url: string, init: RequestInit, fallbackLabel: string) {
  const response = await fetch(url, init);
  const rawPayload = await response.text().catch(() => "");
  let payload: unknown = {};

  if (rawPayload.trim()) {
    try {
      payload = JSON.parse(rawPayload) as unknown;
    } catch {
      payload = rawPayload;
    }
  }

  if (!response.ok) {
    throw new Error(getRequestFailureMessage(payload, response, fallbackLabel));
  }

  return payload as T;
}

export async function runCaptionPipelineForFile({
  accessToken,
  apiBaseUrl,
  file,
  flavorId,
  flavorSlug,
  onStatus,
  runCreatedAt,
  runId,
}: CaptionPipelineParams): Promise<CaptionPipelineResult> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
  }

  const presign = await requestJson<{ cdnUrl: string; presignedUrl: string }>(
    `${apiBaseUrl}/pipeline/generate-presigned-url`,
    {
      body: JSON.stringify({
        contentType: file.type,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "Unable to create an upload URL",
  );

  const uploadResponse = await fetch(presign.presignedUrl, {
    body: file,
    headers: {
      "Content-Type": file.type,
    },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed.");
  }

  onStatus?.("registering", {
    imageId: null,
    imageUrl: presign.cdnUrl,
  });

  const registeredImage = await requestJson<{ imageId: string }>(
    `${apiBaseUrl}/pipeline/upload-image-from-url`,
    {
      body: JSON.stringify({
        imageUrl: presign.cdnUrl,
        isCommonUse: false,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "Unable to register the uploaded image",
  );

  onStatus?.("generating", {
    imageId: registeredImage.imageId,
    imageUrl: presign.cdnUrl,
  });

  const generatedCaptions = await requestJson<unknown>(
    `${apiBaseUrl}/pipeline/generate-captions`,
    {
      body: JSON.stringify({
        humorFlavorId: flavorId,
        imageId: registeredImage.imageId,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "Caption generation failed",
  );
  const captionEntries = mapGeneratedCaptions({
    flavorId,
    flavorSlug,
    generatedCaptions,
    imageId: registeredImage.imageId,
    imageName: file.name,
    imageUrl: presign.cdnUrl,
    runCreatedAt,
    runId,
  }).filter((entry) => typeof entry.captionText === "string" && entry.captionText.trim().length > 0);

  if (captionEntries.length === 0) {
    throw new Error("Caption generation failed: upstream returned no usable captions.");
  }

  return {
    captionEntries,
    imageId: registeredImage.imageId,
    imageUrl: presign.cdnUrl,
  };
}

export async function runCaptionPipelineForExistingImage({
  accessToken,
  apiBaseUrl,
  flavorId,
  flavorSlug,
  imageId,
  imageName,
  imageUrl,
  onStatus,
  runCreatedAt,
  runId,
}: ExistingImageCaptionPipelineParams): Promise<CaptionPipelineResult> {
  let pipelineImageId = imageId;

  if (imageUrl) {
    onStatus?.("registering", {
      imageId: null,
      imageUrl,
    });

    const registeredImage = await requestJson<{ imageId: string }>(
      `${apiBaseUrl}/pipeline/upload-image-from-url`,
      {
        body: JSON.stringify({
          imageUrl,
          isCommonUse: false,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
      "Unable to register the study image",
    );

    pipelineImageId = registeredImage.imageId;
  }

  onStatus?.("generating", {
    imageId: pipelineImageId,
    imageUrl,
  });

  const generatedCaptions = await requestJson<unknown>(
    `${apiBaseUrl}/pipeline/generate-captions`,
    {
      body: JSON.stringify({
        humorFlavorId: flavorId,
        imageId: pipelineImageId,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    "Caption generation failed",
  );

  const captionEntries = mapGeneratedCaptions({
    flavorId,
    flavorSlug,
    generatedCaptions,
    imageId: pipelineImageId,
    imageName,
    imageUrl,
    runCreatedAt,
    runId,
  }).filter((entry) => typeof entry.captionText === "string" && entry.captionText.trim().length > 0);

  if (captionEntries.length === 0) {
    throw new Error("Caption generation failed: upstream returned no usable captions.");
  }

  return {
    captionEntries,
    imageId: pipelineImageId,
    imageUrl,
  };
}
