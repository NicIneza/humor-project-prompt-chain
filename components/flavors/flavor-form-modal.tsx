"use client";

import { useState } from "react";

import { ModalShell } from "@/components/dashboard/modal-shell";
import { normalizeSlug } from "@/lib/slugs";

type FlavorFormModalProps = {
  description: string;
  initialDescription?: string;
  initialSlug?: string;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (draft: { description: string; slug: string }) => void;
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
  submitLabel,
  title,
}: FlavorFormModalProps) {
  const [draftSlug, setDraftSlug] = useState(initialSlug);
  const [draftDescription, setDraftDescription] = useState(initialDescription);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      description: draftDescription,
      slug: draftSlug,
    });
  }

  return (
    <ModalShell eyebrow="Flavor" onClose={onClose} title={title}>
      <p className="modal-copy">{description}</p>

      <form className="stack" onSubmit={handleSubmit}>
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
