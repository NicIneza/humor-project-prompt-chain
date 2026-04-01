"use client";

import { useState } from "react";

import { ModalShell } from "@/components/dashboard/modal-shell";
import { normalizeSlug } from "@/lib/slugs";

type FlavorPresetOption = {
  description: string;
  flavorDescription: string;
  label: string;
  slug: string;
};

type FlavorFormModalProps = {
  description: string;
  initialDescription?: string;
  initialSlug?: string;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (draft: { description: string; presetSlug: string | null; slug: string }) => void;
  presetOptions?: FlavorPresetOption[];
  submitLabel: string;
  title: string;
};

export function FlavorFormModal({
  description,
  initialDescription = "",
  initialSlug = "",
  isOpen,
  isPending,
  onClose,
  onSubmit,
  presetOptions = [],
  submitLabel,
  title,
}: FlavorFormModalProps) {
  const [draftSlug, setDraftSlug] = useState(initialSlug);
  const [draftDescription, setDraftDescription] = useState(initialDescription);
  const [draftPresetSlug, setDraftPresetSlug] = useState("");

  if (!isOpen) {
    return null;
  }

  const selectedPreset =
    presetOptions.find((preset) => preset.slug === draftPresetSlug) ?? null;

  function handlePresetChange(nextPresetSlug: string) {
    setDraftPresetSlug(nextPresetSlug);

    const nextPreset =
      presetOptions.find((preset) => preset.slug === nextPresetSlug) ?? null;

    if (!nextPreset) {
      return;
    }

    setDraftSlug(nextPreset.slug);
    setDraftDescription(nextPreset.flavorDescription);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      description: draftDescription,
      presetSlug: draftPresetSlug || null,
      slug: draftSlug,
    });
  }

  return (
    <ModalShell eyebrow="Flavor" onClose={onClose} title={title}>
      <p className="modal-copy">{description}</p>

      <form className="stack" onSubmit={handleSubmit}>
        {presetOptions.length > 0 ? (
          <div className="field">
            <label htmlFor="flavor-preset">Starter template</label>
            <select
              className="select"
              id="flavor-preset"
              onChange={(event) => handlePresetChange(event.target.value)}
              value={draftPresetSlug}
            >
              <option value="">Start from scratch</option>
              {presetOptions.map((preset) => (
                <option key={preset.slug} value={preset.slug}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="field-hint">
              {selectedPreset
                ? selectedPreset.description
                : "Choose a template to scaffold a full prompt chain automatically."}
            </p>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="flavor-slug">Slug</label>
          <input
            className="input"
            id="flavor-slug"
            onBlur={() => setDraftSlug((current) => normalizeSlug(current))}
            onChange={(event) => setDraftSlug(event.target.value)}
            placeholder="co-lum-bia-copy"
            required
            value={draftSlug}
          />
        </div>

        <div className="field">
          <label htmlFor="flavor-description">Description</label>
          <textarea
            className="textarea"
            id="flavor-description"
            onChange={(event) => setDraftDescription(event.target.value)}
            placeholder="Document how this humor flavor should behave."
            value={draftDescription}
          />
        </div>

        <div className="button-row button-row-end">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="button" disabled={isPending} type="submit">
            {isPending ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
