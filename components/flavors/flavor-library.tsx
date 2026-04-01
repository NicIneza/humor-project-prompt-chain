"use client";

import Link from "next/link";
import { type CSSProperties, useDeferredValue, useState, useTransition } from "react";

import { FlavorFormModal } from "@/components/flavors/flavor-form-modal";
import { PlusIcon, SearchIcon, SparklesIcon } from "@/components/ui/icons";
import { getErrorMessage } from "@/lib/errors";
import { HUMOR_FLAVOR_PRESETS } from "@/lib/flavor-presets";
import type { HumorFlavor, HumorFlavorListItem } from "@/lib/types";

type FlavorLibraryProps = {
  initialFlavors: HumorFlavorListItem[];
  loadErrors: string[];
};

type FlavorPayload = {
  appliedPresetSlug: string | null;
  createdStepCount: number;
  flavor: HumorFlavor;
};

type Notice = {
  tone: "error" | "success";
  text: string;
};

const FLAVOR_CARD_TONES = [
  {
    darkBack: "#6e5a7c",
    darkBorder: "rgba(246, 238, 233, 0.16)",
    darkFront: "#4c3658",
    lightBack: "#d8c6e3",
    lightBorder: "rgba(91, 69, 112, 0.14)",
    lightFront: "#e7d9ec",
  },
  {
    darkBack: "#77678a",
    darkBorder: "rgba(245, 231, 240, 0.16)",
    darkFront: "#58466a",
    lightBack: "#cfc7e2",
    lightBorder: "rgba(90, 74, 121, 0.14)",
    lightFront: "#dfd8ec",
  },
  {
    darkBack: "#8a6f7f",
    darkBorder: "rgba(246, 233, 231, 0.16)",
    darkFront: "#6a4f63",
    lightBack: "#ddc7d1",
    lightBorder: "rgba(109, 74, 98, 0.14)",
    lightFront: "#ecd9e1",
  },
  {
    darkBack: "#8d7b73",
    darkBorder: "rgba(245, 236, 228, 0.16)",
    darkFront: "#6b5a67",
    lightBack: "#ddcfc3",
    lightBorder: "rgba(117, 90, 81, 0.14)",
    lightFront: "#ece0d6",
  },
] as const;

function getFlavorMonogram(slug: string) {
  const initials = slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || slug.slice(0, 1).toUpperCase() || "HF";
}

function parseResponse<T>(response: Response) {
  return response
    .json()
    .catch(() => ({}))
    .then((payload) => {
      const typedPayload = payload as T & { error?: string };

      if (!response.ok) {
        throw new Error(typedPayload.error ?? "The request failed.");
      }

      return typedPayload;
    });
}

export function FlavorLibrary({ initialFlavors, loadErrors }: FlavorLibraryProps) {
  const [flavors, setFlavors] = useState(initialFlavors);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<Notice | null>(
    loadErrors.length > 0 ? { text: loadErrors.join(" "), tone: "error" } : null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatePending, startCreateTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const filteredFlavors = flavors.filter((flavor) => {
    const haystack = `${flavor.slug} ${flavor.description ?? ""}`.toLowerCase();
    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const presetOptions = HUMOR_FLAVOR_PRESETS.map((preset) => ({
    description: preset.description,
    flavorDescription: preset.flavorDescription,
    label: preset.label,
    slug: preset.slug,
  }));

  function handleCreateFlavor(draft: {
    description: string;
    presetSlug: string | null;
    slug: string;
  }) {
    startCreateTransition(async () => {
      try {
        const response = await fetch("/api/humor-flavors", {
          body: JSON.stringify({
            description: draft.description,
            presetSlug: draft.presetSlug,
            slug: draft.slug,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = await parseResponse<FlavorPayload>(response);
        const nextFlavor = {
          ...payload.flavor,
          stepCount: payload.createdStepCount,
        } satisfies HumorFlavorListItem;

        setFlavors((current) => [nextFlavor, ...current]);
        setNotice({
          text:
            payload.createdStepCount > 0
              ? `Created "${payload.flavor.slug}" with ${payload.createdStepCount} scaffolded steps.`
              : `Created "${payload.flavor.slug}".`,
          tone: "success",
        });
        setIsCreateOpen(false);
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  return (
    <>
      <section className="page-card hero-card">
        <div className="toolbar-grid">
          <label className="search-field">
            <SearchIcon />
            <input
              aria-label="Search a humor flavor"
              className="search-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a humor flavor"
              type="search"
              value={query}
            />
          </label>

          <button className="create-rail" onClick={() => setIsCreateOpen(true)} type="button">
            <div className="create-rail-copy">
              <span className="create-rail-label">Create your own humor flavor</span>
              <span className="create-rail-subtitle">Start a new prompt-chain strategy from scratch.</span>
            </div>
            <span className="create-rail-icon">
              <PlusIcon />
            </span>
          </button>
        </div>

        {notice ? (
          <div className={`notice ${notice.tone === "error" ? "notice-error" : "notice-success"}`}>
            <strong>{notice.tone === "error" ? "Action failed" : "Saved"}</strong>
            {notice.text}
          </div>
        ) : null}
      </section>

      <section className="page-card stack">
        <div className="split-header">
          <div className="stack" style={{ gap: "0.3rem" }}>
            <p className="eyebrow">Library</p>
            <h2 className="section-title">All humor flavors</h2>
          </div>
          <div className="header-pill">
            <SparklesIcon />
            <span>{filteredFlavors.length} flavor(s)</span>
          </div>
        </div>

        {filteredFlavors.length === 0 ? (
          <div className="empty-state">
            No flavors match the current search. Clear the search or create a new humor flavor.
          </div>
        ) : (
          <div className="library-grid">
            {filteredFlavors.map((flavor, index) => {
              const tone = FLAVOR_CARD_TONES[index % FLAVOR_CARD_TONES.length];
              const toneStyle = {
                "--library-back-dark": tone.darkBack,
                "--library-back-light": tone.lightBack,
                "--library-border-dark": tone.darkBorder,
                "--library-border-light": tone.lightBorder,
                "--library-front-dark": tone.darkFront,
                "--library-front-light": tone.lightFront,
              } as CSSProperties;

              return (
                <Link
                  className="library-card"
                  href={`/dashboard/flavors/${flavor.id}`}
                  key={flavor.id}
                  style={toneStyle}
                >
                  <div className="library-card-inner">
                    <div className="library-card-face library-card-front">
                      <span aria-hidden="true" className="library-card-watermark">
                        {getFlavorMonogram(flavor.slug)}
                      </span>
                      <p className="library-card-tag">Humor flavor</p>
                      <p className="library-card-title">{flavor.slug}</p>
                    </div>
                    <div className="library-card-face library-card-back">
                      <p className="library-card-label">Description</p>
                      <p className="library-card-body">
                        {flavor.description || "No flavor description yet."}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <FlavorFormModal
        description="Choose a slug and a short description for the new flavor."
        isOpen={isCreateOpen}
        isPending={isCreatePending}
        key={`create-flavor-${isCreateOpen ? "open" : "closed"}`}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateFlavor}
        presetOptions={presetOptions}
        submitLabel="Create flavor"
        title="Create a humor flavor"
      />
    </>
  );
}
