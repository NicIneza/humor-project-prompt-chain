"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";

import { ModalShell } from "@/components/dashboard/modal-shell";
import { ArrowLeftIcon, SearchIcon } from "@/components/ui/icons";
import {
  generateClientId,
  runCaptionPipelineForFile,
  SUPPORTED_IMAGE_TYPES,
} from "@/lib/caption-pipeline";
import {
  getCachedCaptions,
  pushCachedCaptions,
  pushCachedTestRun,
} from "@/lib/control-room-cache";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { CachedCaption, CachedTestRun, HumorFlavor } from "@/lib/types";

type FlavorCaptionsProps = {
  apiBaseUrl: string;
  currentPage: number;
  flavor: HumorFlavor;
  initialCaptions: CachedCaption[];
  initialLoadError: string | null;
  pageSize: number;
  totalCount: number;
};

type Notice = {
  tone: "error" | "success";
  text: string;
};

type SelectedImage = {
  error: string | null;
  file: File;
  id: string;
  imageId: string | null;
  imageUrl: string | null;
  previewUrl: string;
  status: "completed" | "failed" | "generating" | "queued" | "registering" | "uploading";
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getCaptionHeading(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "Generated caption";
  }

  return trimmed.length > 84 ? `${trimmed.slice(0, 81)}...` : trimmed;
}

function getCaptionKey(caption: CachedCaption) {
  if (caption.captionRequestId) {
    return `request:${caption.captionRequestId}:${caption.imageId ?? ""}`;
  }

  if (caption.imageId && caption.captionText) {
    return `image:${caption.imageId}:${caption.captionText}`;
  }

  return `id:${caption.id}`;
}

function mergeCaptions(...groups: CachedCaption[][]) {
  const merged = [...groups.flat()].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
  const seen = new Set<string>();

  return merged.filter((caption) => {
    const key = getCaptionKey(caption);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function FlavorCaptions({
  apiBaseUrl,
  currentPage,
  flavor,
  initialCaptions,
  initialLoadError,
  pageSize,
  totalCount,
}: FlavorCaptionsProps) {
  const [query, setQuery] = useState("");
  const [captions, setCaptions] = useState<CachedCaption[]>(() => initialCaptions);
  const [selectedCaption, setSelectedCaption] = useState<CachedCaption | null>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isGeneratePending, startGenerateTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const previewUrlsRef = useRef<string[]>([]);
  const effectiveTotalCount = Math.max(totalCount + generatedCount, currentPage === 1 ? captions.length : totalCount + generatedCount);
  const totalPages = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));

  useEffect(() => {
    function loadCaptions() {
      if (currentPage === 1) {
        setCaptions(mergeCaptions(getCachedCaptions(flavor.id), initialCaptions).slice(0, 200));
        return;
      }

      setCaptions(initialCaptions);
    }

    loadCaptions();
    window.addEventListener("storage", loadCaptions);

    return () => {
      window.removeEventListener("storage", loadCaptions);
    };
  }, [currentPage, flavor.id, initialCaptions]);

  useEffect(() => {
    previewUrlsRef.current = selectedImages.map((image) => image.previewUrl);
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  function updateImage(id: string, patch: Partial<SelectedImage>) {
    setSelectedImages((current) =>
      current.map((image) => (image.id === id ? { ...image, ...patch } : image)),
    );
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const nextImages = files.map((file) => ({
      error: SUPPORTED_IMAGE_TYPES.has(file.type)
        ? null
        : `Unsupported type: ${file.type || "unknown"}`,
      file,
      id: generateClientId(),
      imageId: null,
      imageUrl: null,
      previewUrl: URL.createObjectURL(file),
      status: "queued" as const,
    }));

    setSelectedImages((current) => [...current, ...nextImages]);
    setNotice(null);
    event.target.value = "";
  }

  function handleClearSelection() {
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }

  async function runSingleImage(
    accessToken: string,
    runId: string,
    image: SelectedImage,
    runCreatedAt: string,
  ) {
    if (!SUPPORTED_IMAGE_TYPES.has(image.file.type)) {
      throw new Error(image.error ?? "Unsupported image type.");
    }

    updateImage(image.id, { error: null, status: "uploading" });

    const pipelineResult = await runCaptionPipelineForFile({
      accessToken,
      apiBaseUrl,
      file: image.file,
      flavorId: flavor.id,
      flavorSlug: flavor.slug,
      onStatus: (status, context) => {
        updateImage(image.id, {
          imageId: context.imageId,
          imageUrl: context.imageUrl,
          status,
        });
      },
      runCreatedAt,
      runId,
    });

    updateImage(image.id, {
      error: null,
      imageId: pipelineResult.imageId,
      imageUrl: pipelineResult.imageUrl,
      status: "completed",
    });

    return {
      captionEntries: pipelineResult.captionEntries,
      imageId: pipelineResult.imageId,
      imageName: image.file.name,
      imageUrl: pipelineResult.imageUrl,
      status: "completed" as const,
    };
  }

  function handleGenerateCaptions() {
    if (selectedImages.length === 0) {
      setNotice({ text: "Choose one or more images before generating captions.", tone: "error" });
      return;
    }

    startGenerateTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("A Supabase session is required before generating captions.");
        }

        const runId = generateClientId();
        const runCreatedAt = new Date().toISOString();

        const runResults = await Promise.all(
          selectedImages.map(async (image) => {
            try {
              return await runSingleImage(accessToken, runId, image, runCreatedAt);
            } catch (error) {
              updateImage(image.id, {
                error: getErrorMessage(error),
                status: "failed",
              });

              return {
                captionEntries: [] satisfies CachedCaption[],
                error: getErrorMessage(error),
                imageId: image.imageId,
                imageName: image.file.name,
                imageUrl: image.imageUrl,
                status: "failed" as const,
              };
            }
          }),
        );

        const nextCaptions = runResults.flatMap((result) => result.captionEntries);

        if (nextCaptions.length > 0) {
          pushCachedCaptions(nextCaptions);
          setCaptions((current) => mergeCaptions(nextCaptions, current).slice(0, 200));
          setGeneratedCount((current) => current + nextCaptions.length);
        }

        const nextRun = {
          createdAt: runCreatedAt,
          flavorId: flavor.id,
          flavorSlug: flavor.slug,
          id: runId,
          images: runResults.map((result) => ({
            captionIds: result.captionEntries.map((entry) => entry.id),
            error: "error" in result ? result.error : null,
            imageId: result.imageId ?? null,
            imageName: result.imageName,
            imageUrl: result.imageUrl ?? null,
            status: result.status,
          })),
          name: `Caption Run ${formatDate(runCreatedAt)}`,
        } satisfies CachedTestRun;

        pushCachedTestRun(nextRun);

        const completedCount = runResults.filter((result) => result.status === "completed").length;

        setNotice({
          text: `Generated captions for ${completedCount} of ${runResults.length} image(s).`,
          tone: completedCount > 0 ? "success" : "error",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  const filteredCaptions = captions.filter((caption) => {
    const haystack = `${caption.captionText ?? ""} ${caption.imageName} ${caption.captionRequestId ?? ""} ${
      caption.llmPromptChainId ?? ""
    }`.toLowerCase();

    return haystack.includes(deferredQuery.trim().toLowerCase());
  });
  const visibleCaptions =
    deferredQuery.trim().length > 0 ? filteredCaptions : filteredCaptions.slice(0, pageSize);
  const captionCount =
    deferredQuery.trim().length > 0 ? filteredCaptions.length : effectiveTotalCount;

  return (
    <>
      <section className="page-card hero-card">
        <div className="page-heading">
          <Link className="back-link" href={`/dashboard/flavors/${flavor.id}`}>
            <ArrowLeftIcon />
            <span>Back to flavor</span>
          </Link>
          <p className="eyebrow">Captions</p>
          <h1 className="detail-title">{flavor.slug}</h1>
          <p className="page-subtitle">
            {flavor.description || "Upload images and generate captions for this humor flavor."}
          </p>
        </div>

        <div className="toolbar-grid toolbar-grid-tight">
          <label className="search-field">
            <SearchIcon />
            <input
              aria-label="Search captions"
              className="search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search captions"
              type="search"
              value={query}
            />
          </label>

          <div className="create-rail create-rail-static">
            <div className="create-rail-copy">
              <span className="create-rail-label">Upload images</span>
              <span className="create-rail-subtitle">
                {selectedImages.length > 0
                  ? `${selectedImages.length} image(s) selected for this flavor.`
                  : "Choose JPEG, PNG, WEBP, GIF, or HEIC files and generate captions here."}
              </span>
            </div>

            <div className="button-row">
              <label className="button button-secondary">
                <span>Choose files</span>
                <input
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic,.heic"
                  className="sr-only"
                  multiple
                  onChange={handleFileSelection}
                  type="file"
                />
              </label>
              <button
                className="button"
                disabled={isGeneratePending || selectedImages.length === 0}
                onClick={handleGenerateCaptions}
                type="button"
              >
                {isGeneratePending ? "Generating..." : "Generate captions"}
              </button>
            </div>
          </div>
        </div>

        {notice ? (
          <div className={`notice ${notice.tone === "error" ? "notice-error" : "notice-success"}`}>
            <strong>{notice.tone === "error" ? "Caption run failed" : "Caption run updated"}</strong>
            {notice.text}
          </div>
        ) : null}

        {initialLoadError ? (
          <div className="notice notice-error">
            <strong>History unavailable</strong>
            {initialLoadError}
          </div>
        ) : null}
      </section>

      {selectedImages.length > 0 ? (
        <section className="page-card stack">
          <div className="split-header">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <p className="eyebrow">Upload Queue</p>
              <h2 className="section-title">Images ready for caption generation</h2>
            </div>
            <div className="button-row">
              <button className="button button-ghost" onClick={handleClearSelection} type="button">
                Clear selection
              </button>
            </div>
          </div>

          <div className="study-grid">
            {selectedImages.map((image) => (
              <article className="study-card" key={image.id}>
                <div className="study-card-top">
                  <span className="summary-label">{image.status}</span>
                  {image.imageId ? <span className="tiny-badge">{image.imageId.slice(0, 8)}</span> : null}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={image.file.name} className="study-thumb" src={image.imageUrl ?? image.previewUrl} />
                <p className="study-card-subtitle">
                  {image.error ?? "Ready to move through the upload, register, and caption pipeline."}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-card stack">
        <div className="split-header">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow">Flavor Captions</p>
            <h2 className="section-title">Latest caption entries</h2>
            <p className="page-subtitle">Generated captions appear here after each upload run.</p>
          </div>
          <div className="button-row">
            <span className="tiny-badge">{captionCount} caption(s)</span>
            <span className="tiny-badge">
              Page {Math.min(currentPage, totalPages)} / {totalPages}
            </span>
          </div>
        </div>

        {visibleCaptions.length === 0 ? (
          <div className="empty-state">
            No generated captions yet. Upload one or more images above to populate this list for this humor flavor.
          </div>
        ) : (
          <div className="caption-grid">
            {visibleCaptions.map((caption) => (
              <button
                className="caption-card caption-card-button"
                key={caption.id}
                onClick={() => setSelectedCaption(caption)}
                type="button"
              >
                <div className="caption-card-media">
                  {caption.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={caption.imageName} className="caption-image" src={caption.imageUrl} />
                  ) : (
                    <div className="caption-image placeholder-tile">IMG</div>
                  )}
                </div>

                <div className="stack caption-card-copy" style={{ gap: "0.55rem" }}>
                  <p className="caption-copy-preview">
                    {caption.captionText || "No caption text found in the stored response."}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {deferredQuery.trim().length === 0 && totalPages > 1 ? (
          <div className="button-row button-row-end">
            {currentPage > 1 ? (
              <Link className="button button-ghost" href={`?page=${currentPage - 1}`}>
                Previous
              </Link>
            ) : null}
            {currentPage < totalPages ? (
              <Link className="button button-ghost" href={`?page=${currentPage + 1}`}>
                Next
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {selectedCaption ? (
        <ModalShell
          eyebrow="Caption Details"
          onClose={() => setSelectedCaption(null)}
          title={getCaptionHeading(selectedCaption.captionText)}
        >
          <div className="stack">
            <div className="preview-grid">
              <div className="preview-card">
                <span className="summary-label">Generated</span>
                <span className="summary-value">{formatDate(selectedCaption.createdAt)}</span>
              </div>
              <div className="preview-card">
                <span className="summary-label">Image ID</span>
                <span className="summary-value">{selectedCaption.imageId ?? "Not available"}</span>
              </div>
              <div className="preview-card">
                <span className="summary-label">caption_request_id</span>
                <span className="summary-value">{selectedCaption.captionRequestId ?? "Not available"}</span>
              </div>
              <div className="preview-card">
                <span className="summary-label">llm_prompt_chain_id</span>
                <span className="summary-value">{selectedCaption.llmPromptChainId ?? "Not available"}</span>
              </div>
            </div>

            {selectedCaption.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={selectedCaption.imageName} className="caption-detail-image" src={selectedCaption.imageUrl} />
            ) : null}

            <div className="prompt-card">
              <p className="summary-label">Caption</p>
              <p className="caption-detail-copy">
                {selectedCaption.captionText || "No caption text found in the stored response."}
              </p>
            </div>

            <div className="prompt-card">
              <p className="summary-label">Raw response</p>
              <pre className="prompt-copy">{JSON.stringify(selectedCaption.rawResponse, null, 2)}</pre>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
