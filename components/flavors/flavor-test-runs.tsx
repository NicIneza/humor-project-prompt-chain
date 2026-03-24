"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, useTransition } from "react";

import { ArrowLeftIcon, SearchIcon, SparklesIcon } from "@/components/ui/icons";
import {
  generateClientId,
  runCaptionPipelineForFile,
  SUPPORTED_IMAGE_TYPES,
} from "@/lib/caption-pipeline";
import { pushCachedCaptions } from "@/lib/control-room-cache";
import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type { CachedCaption, HumorFlavor, StudyImageSet, StudyImageSetImage } from "@/lib/types";

type FlavorTestRunsProps = {
  apiBaseUrl: string;
  flavor: HumorFlavor;
  initialLoadError: string | null;
  studyImageSets: StudyImageSet[];
};

type Notice = {
  tone: "error" | "success";
  text: string;
};

type RunImageState = StudyImageSetImage & {
  captionText: string | null;
  error: string | null;
  status: "completed" | "failed" | "generating" | "queued" | "registering" | "uploading";
};

function buildRunImages(images: StudyImageSetImage[]) {
  return images.map((image) => ({
    ...image,
    captionText: null,
    error: null,
    status: "queued" as const,
  }));
}

function inferContentType(fileName: string, imageUrl: string | null) {
  const candidate = `${fileName} ${imageUrl ?? ""}`.toLowerCase();

  if (candidate.includes(".heic")) {
    return "image/heic";
  }

  if (candidate.includes(".webp")) {
    return "image/webp";
  }

  if (candidate.includes(".gif")) {
    return "image/gif";
  }

  if (candidate.includes(".png")) {
    return "image/png";
  }

  if (candidate.includes(".jpg") || candidate.includes(".jpeg")) {
    return "image/jpeg";
  }

  return "image/jpeg";
}

async function fetchStudyImageFile(image: StudyImageSetImage) {
  if (!image.imageUrl) {
    throw new Error("This study image is missing a URL, so it cannot be uploaded to the caption pipeline.");
  }

  const response = await fetch("/api/study-images/fetch", {
    body: JSON.stringify({
      imageUrl: image.imageUrl,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const message = typeof payload?.error === "string" ? payload.error : null;
    throw new Error(message ?? `Unable to download the study image from ${image.imageUrl}.`);
  }

  const blob = await response.blob();
  const contentType = blob.type || inferContentType(image.imageName, image.imageUrl);

  if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported image type: ${contentType || "unknown"}.`);
  }

  const fileName = image.imageName.includes(".")
    ? image.imageName
    : `${image.id}.${contentType.split("/")[1] ?? "jpg"}`;

  return new File([blob], fileName, {
    type: contentType,
  });
}

function getImageStatusCopy(image: RunImageState) {
  if (image.captionText) {
    return image.captionText;
  }

  if (image.error) {
    return image.error;
  }

  if (image.status === "uploading") {
    return "Uploading this image into the caption pipeline.";
  }

  if (image.status === "generating") {
    return "Generating captions for this image now.";
  }

  if (image.status === "registering") {
    return "Registering this image with the caption pipeline.";
  }

  if (image.status === "completed") {
    return "Caption generation completed for this image.";
  }

  return "Ready to generate captions for this humor flavor.";
}

export function FlavorTestRuns({
  apiBaseUrl,
  flavor,
  initialLoadError,
  studyImageSets,
}: FlavorTestRunsProps) {
  const [query, setQuery] = useState("");
  const [selectedSetId, setSelectedSetId] = useState<number | null>(studyImageSets[0]?.id ?? null);
  const [activeImages, setActiveImages] = useState<RunImageState[]>(
    studyImageSets[0] ? buildRunImages(studyImageSets[0].images) : [],
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isRunPending, startRunTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (studyImageSets.length === 0) {
      setSelectedSetId(null);
      setActiveImages([]);
      return;
    }

    setSelectedSetId((current) =>
      studyImageSets.some((set) => set.id === current) ? current : studyImageSets[0].id,
    );
  }, [studyImageSets]);

  const selectedSet = studyImageSets.find((set) => set.id === selectedSetId) ?? null;

  useEffect(() => {
    if (!selectedSet) {
      setActiveImages([]);
      return;
    }

    setActiveImages(buildRunImages(selectedSet.images));
  }, [selectedSet]);

  function updateImage(id: string, patch: Partial<RunImageState>) {
    setActiveImages((current) =>
      current.map((image) => (image.id === id ? { ...image, ...patch } : image)),
    );
  }

  function handleSelectSet(setId: number) {
    if (isRunPending) {
      return;
    }

    setSelectedSetId(setId);
    setNotice(null);
  }

  function handleRunSet() {
    if (!selectedSet) {
      setNotice({ text: "Choose a study image set before starting a test run.", tone: "error" });
      return;
    }

    if (selectedSet.images.length === 0) {
      setNotice({ text: "This study image set does not contain any images yet.", tone: "error" });
      return;
    }

    startRunTransition(async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("A Supabase session is required before running the caption pipeline.");
        }

        const runId = generateClientId();
        const runCreatedAt = new Date().toISOString();

        setActiveImages(buildRunImages(selectedSet.images));

        const runResults = await Promise.all(
          selectedSet.images.map(async (image) => {
            try {
              updateImage(image.id, {
                captionText: null,
                error: null,
                status: "uploading",
              });

              const file = await fetchStudyImageFile(image);
              const pipelineResult = await runCaptionPipelineForFile({
                accessToken,
                apiBaseUrl,
                file,
                flavorId: flavor.id,
                flavorSlug: flavor.slug,
                onStatus: (status) => {
                  updateImage(image.id, {
                    captionText: null,
                    error: null,
                    status,
                  });
                },
                runCreatedAt,
                runId,
              });

              updateImage(image.id, {
                captionText: pipelineResult.captionEntries[0]?.captionText ?? null,
                error: null,
                status: "completed",
              });

              return {
                captionEntries: pipelineResult.captionEntries,
                imageId: pipelineResult.imageId,
                imageName: image.imageName,
                imageUrl: pipelineResult.imageUrl ?? image.imageUrl,
                status: "completed" as const,
              };
            } catch (error) {
              const message = getErrorMessage(error);

              updateImage(image.id, {
                captionText: null,
                error: message,
                status: "failed",
              });

              return {
                captionEntries: [] satisfies CachedCaption[],
                error: message,
                imageId: image.id,
                imageName: image.imageName,
                imageUrl: image.imageUrl,
                status: "failed" as const,
              };
            }
          }),
        );

        const nextCaptions = runResults.flatMap((result) => result.captionEntries);

        if (nextCaptions.length > 0) {
          pushCachedCaptions(nextCaptions);
        }

        const completedCount = runResults.filter((result) => result.status === "completed").length;
        const firstFailure =
          runResults.find((result) => "error" in result && result.error)?.error ?? null;

        setNotice({
          text:
            completedCount === runResults.length || !firstFailure
              ? `Generated captions for ${completedCount} of ${runResults.length} image(s) in ${selectedSet.slug}.`
              : `Generated captions for ${completedCount} of ${runResults.length} image(s) in ${selectedSet.slug}. ${firstFailure}`,
          tone: completedCount > 0 ? "success" : "error",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  const filteredSets = studyImageSets.filter((set) => {
    const haystack = `${set.slug} ${set.description ?? ""}`.toLowerCase();
    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  return (
    <>
      <section className="page-card hero-card">
        <div className="page-heading">
          <Link className="back-link" href={`/dashboard/flavors/${flavor.id}`}>
            <ArrowLeftIcon />
            <span>Back to flavor</span>
          </Link>
          <p className="eyebrow">Test</p>
          <h1 className="detail-title">Study image sets</h1>
          <p className="page-subtitle">
            {flavor.description || "Choose a saved study image set and run this humor flavor across its images."}
          </p>
        </div>

        <div className="toolbar-grid toolbar-grid-tight">
          <label className="search-field">
            <SearchIcon />
            <input
              aria-label="Search study image sets"
              className="search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search study image sets"
              type="search"
              value={query}
            />
          </label>

          <div className="create-rail create-rail-static">
            <div className="create-rail-copy">
              <span className="create-rail-label">
                {selectedSet ? `Run ${selectedSet.slug}` : "Choose a study image set"}
              </span>
              <span className="create-rail-subtitle">
                {selectedSet
                  ? `${selectedSet.imageCount} image(s) will run through this humor flavor.`
                  : "Select a study image set from the library below to start a caption run."}
              </span>
            </div>

            <div className="button-row">
              <Link className="button button-secondary" href={`/dashboard/flavors/${flavor.id}/captions`}>
                View captions
              </Link>
              <button
                className="button"
                disabled={isRunPending || !selectedSet || selectedSet.imageCount === 0}
                onClick={handleRunSet}
                type="button"
              >
                {isRunPending ? "Running..." : "Start test run"}
              </button>
            </div>
          </div>
        </div>

        {notice ? (
          <div className={`notice ${notice.tone === "error" ? "notice-error" : "notice-success"}`}>
            <strong>{notice.tone === "error" ? "Test run failed" : "Test run updated"}</strong>
            {notice.text}
          </div>
        ) : null}

        {initialLoadError ? (
          <div className="notice notice-error">
            <strong>Study sets unavailable</strong>
            {initialLoadError}
          </div>
        ) : null}
      </section>

      <section className="page-card stack">
        <div className="split-header">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow">Study Image Sets</p>
            <h2 className="section-title">Study image set library</h2>
            <p className="page-subtitle">Choose an image set to test this humor flavor.</p>
          </div>
          <div className="header-pill">
            <SparklesIcon />
            <span>{filteredSets.length} set(s)</span>
          </div>
        </div>

        {filteredSets.length === 0 ? (
          <div className="empty-state">
            No study image sets match that search yet.
          </div>
        ) : (
          <div className="study-grid">
            {filteredSets.map((set) => (
              <button
                className={`study-card study-card-selectable ${set.id === selectedSetId ? "study-card-selected" : ""}`}
                disabled={isRunPending}
                key={set.id}
                onClick={() => handleSelectSet(set.id)}
                type="button"
              >
                <div className="study-card-top">
                  <span className="summary-label">Image set</span>
                  <span className="tiny-badge">
                    {set.imageCount} image{set.imageCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="study-card-title">{set.slug}</p>
                <p className="study-card-subtitle">
                  {set.description || "Saved set for testing this humor flavor."}
                </p>

                {set.images.length > 0 ? (
                  <div className="study-thumb-row">
                    {set.images.slice(0, 18).map((image) =>
                      image.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={image.imageName} className="study-thumb-mini" key={`${set.id}-${image.id}`} src={image.imageUrl} />
                      ) : (
                        <div className="study-thumb-mini placeholder-tile" key={`${set.id}-${image.id}`}>
                          {image.imageName.slice(0, 1).toUpperCase()}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="empty-state study-empty-inline">No images are linked to this set yet.</div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedSet ? (
        <section className="page-card stack">
          <div className="split-header">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <p className="eyebrow">Current Set</p>
              <h2 className="section-title">{selectedSet.slug}</h2>
              <p className="page-subtitle">
                {selectedSet.description || "Run this full study image set against the selected humor flavor."}
              </p>
            </div>
            <div className="button-row">
              <span className="tiny-badge">
                {selectedSet.imageCount} image{selectedSet.imageCount === 1 ? "" : "s"}
              </span>
              <button
                className="button"
                disabled={isRunPending || selectedSet.imageCount === 0}
                onClick={handleRunSet}
                type="button"
              >
                {isRunPending ? "Running..." : "Run this set"}
              </button>
            </div>
          </div>

          {activeImages.length === 0 ? (
            <div className="empty-state">This study image set does not contain any images yet.</div>
          ) : (
            <div className="study-grid">
              {activeImages.map((image) => (
                <article className="study-card" key={image.id}>
                  <div className="study-card-top">
                    <span className="summary-label">{image.status}</span>
                    <span className="tiny-badge">{image.id.slice(0, 8)}</span>
                  </div>
                  {image.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={image.imageName} className="study-thumb" src={image.imageUrl} />
                  ) : (
                    <div className="study-thumb placeholder-tile">IMG</div>
                  )}
                  <p className="study-card-subtitle">
                    {getImageStatusCopy(image)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
