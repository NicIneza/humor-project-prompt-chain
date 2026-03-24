"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";

import { ModalShell } from "@/components/dashboard/modal-shell";
import { FlavorFormModal } from "@/components/flavors/flavor-form-modal";
import { StepFormModal, type StepDraft } from "@/components/flavors/step-form-modal";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  DuplicateIcon,
  EyeIcon,
  GripIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { getErrorMessage } from "@/lib/errors";
import type { HumorFlavor, HumorFlavorStep, StepCatalog } from "@/lib/types";

type FlavorDetailProps = {
  initialCatalog: StepCatalog;
  initialFlavor: HumorFlavor;
  initialSteps: HumorFlavorStep[];
  loadErrors: string[];
};

type FlavorPayload = {
  flavor: HumorFlavor;
};

type StepPayload = {
  step: HumorFlavorStep;
};

type StepListPayload = {
  flavorId: number;
  steps: HumorFlavorStep[];
};

type Notice = {
  tone: "error" | "success";
  text: string;
};

type ActionIconButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: "danger" | "default";
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
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

function formatSlugLabel(value: string) {
  if (!value) {
    return "Unlabeled";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findStepTypeLabel(catalog: StepCatalog, step: HumorFlavorStep) {
  const stepType = catalog.stepTypes.find((option) => option.id === step.stepTypeId);
  return stepType ? formatSlugLabel(stepType.slug) : `Step ${step.order}`;
}

function findModelLabel(catalog: StepCatalog, step: HumorFlavorStep) {
  return catalog.models.find((model) => model.id === step.modelId)?.name ?? "No model";
}

function findOutputLabel(catalog: StepCatalog, step: HumorFlavorStep) {
  return (
    catalog.outputTypes.find((option) => option.id === step.outputTypeId)?.description ??
    "Output not set"
  );
}

function findInputLabel(catalog: StepCatalog, step: HumorFlavorStep) {
  return (
    catalog.inputTypes.find((option) => option.id === step.inputTypeId)?.description ??
    "Input not set"
  );
}

function reorderSteps(steps: HumorFlavorStep[], draggedStepId: number, targetStepId: number) {
  const current = [...steps].sort((left, right) => left.order - right.order);
  const draggedIndex = current.findIndex((step) => step.id === draggedStepId);
  const targetIndex = current.findIndex((step) => step.id === targetStepId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return current;
  }

  const [draggedStep] = current.splice(draggedIndex, 1);
  current.splice(targetIndex, 0, draggedStep);

  return current.map((step, index) => ({
    ...step,
    order: index + 1,
  }));
}

function ActionIconButton({
  children,
  disabled = false,
  label,
  onClick,
  tone = "default",
}: ActionIconButtonProps) {
  return (
    <span className="icon-tooltip" data-tooltip={label}>
      <button
        aria-label={label}
        className={`icon-button ${tone === "danger" ? "icon-button-danger" : ""}`}
        disabled={disabled}
        onClick={onClick}
        title={label}
        type="button"
      >
        {children}
      </button>
    </span>
  );
}

export function FlavorDetail({
  initialCatalog,
  initialFlavor,
  initialSteps,
  loadErrors,
}: FlavorDetailProps) {
  const router = useRouter();
  const [flavor, setFlavor] = useState(initialFlavor);
  const [steps, setSteps] = useState(initialSteps.sort((left, right) => left.order - right.order));
  const [draggedStepId, setDraggedStepId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(
    loadErrors.length > 0 ? { text: loadErrors.join(" "), tone: "error" } : null,
  );
  const [isEditFlavorOpen, setIsEditFlavorOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [stepBeingEdited, setStepBeingEdited] = useState<HumorFlavorStep | null>(null);
  const [stepBeingViewed, setStepBeingViewed] = useState<HumorFlavorStep | null>(null);
  const [isCreateStepOpen, setIsCreateStepOpen] = useState(false);
  const [isSaveFlavorPending, startSaveFlavorTransition] = useTransition();
  const [isDeleteFlavorPending, startDeleteFlavorTransition] = useTransition();
  const [isDuplicatePending, startDuplicateTransition] = useTransition();
  const [isCreateStepPending, startCreateStepTransition] = useTransition();
  const [isSaveStepPending, startSaveStepTransition] = useTransition();
  const [isDeleteStepPending, startDeleteStepTransition] = useTransition();
  const [isMovePending, startMoveTransition] = useTransition();
  const [isReorderPending, startReorderTransition] = useTransition();

  const selectedSteps = [...steps].sort((left, right) => left.order - right.order);
  const hasCatalog =
    initialCatalog.stepTypes.length > 0 &&
    initialCatalog.inputTypes.length > 0 &&
    initialCatalog.outputTypes.length > 0 &&
    initialCatalog.models.length > 0;

  function replaceFlavorSteps(nextSteps: HumorFlavorStep[]) {
    setSteps(nextSteps.sort((left, right) => left.order - right.order));
  }

  function handleSaveFlavor(draft: { description: string; slug: string }) {
    startSaveFlavorTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavors/${flavor.id}`, {
          body: JSON.stringify({
            description: draft.description,
            slug: draft.slug,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });

        const payload = await parseResponse<FlavorPayload>(response);
        setFlavor(payload.flavor);
        setIsEditFlavorOpen(false);
        setNotice({
          text: `Saved "${payload.flavor.slug}".`,
          tone: "success",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleDuplicateFlavor(draft: { description: string; slug: string }) {
    startDuplicateTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavors/${flavor.id}/duplicate`, {
          body: JSON.stringify({
            description: draft.description,
            slug: draft.slug,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = await parseResponse<FlavorPayload>(response);
        router.push(`/dashboard/flavors/${payload.flavor.id}`);
        router.refresh();
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleDeleteFlavor() {
    const confirmed = window.confirm(`Delete "${flavor.slug}" and all of its steps?`);

    if (!confirmed) {
      return;
    }

    startDeleteFlavorTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavors/${flavor.id}`, {
          method: "DELETE",
        });

        await parseResponse<{ success: boolean }>(response);
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleCreateStep(draft: StepDraft) {
    startCreateStepTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavors/${flavor.id}/steps`, {
          body: JSON.stringify(draft),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = await parseResponse<StepPayload>(response);
        replaceFlavorSteps([...selectedSteps, payload.step]);
        setIsCreateStepOpen(false);
        setNotice({
          text: `Added step ${payload.step.order}.`,
          tone: "success",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleSaveStep(draft: StepDraft) {
    if (!stepBeingEdited) {
      return;
    }

    startSaveStepTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavor-steps/${stepBeingEdited.id}`, {
          body: JSON.stringify(draft),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });

        const payload = await parseResponse<StepPayload>(response);
        replaceFlavorSteps(
          selectedSteps.map((step) => (step.id === payload.step.id ? payload.step : step)),
        );
        setStepBeingEdited(null);
        setNotice({
          text: `Saved step ${payload.step.order}.`,
          tone: "success",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleDeleteStep(step: HumorFlavorStep) {
    const confirmed = window.confirm(`Delete step ${step.order} from "${flavor.slug}"?`);

    if (!confirmed) {
      return;
    }

    startDeleteStepTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavor-steps/${step.id}`, {
          method: "DELETE",
        });

        const payload = await parseResponse<StepListPayload>(response);
        replaceFlavorSteps(payload.steps);
        setStepBeingViewed((current) => (current?.id === step.id ? null : current));
        setStepBeingEdited((current) => (current?.id === step.id ? null : current));
        setNotice({
          text: `Deleted step ${step.order}.`,
          tone: "success",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleMoveStep(step: HumorFlavorStep, direction: "down" | "up") {
    startMoveTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavor-steps/${step.id}/move`, {
          body: JSON.stringify({ direction }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = await parseResponse<StepListPayload>(response);
        replaceFlavorSteps(payload.steps);
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  function handleDrop(targetStepId: number) {
    if (draggedStepId == null || draggedStepId === targetStepId) {
      setDraggedStepId(null);
      return;
    }

    const nextSteps = reorderSteps(selectedSteps, draggedStepId, targetStepId);
    setDraggedStepId(null);

    startReorderTransition(async () => {
      try {
        const response = await fetch(`/api/humor-flavors/${flavor.id}/steps/reorder`, {
          body: JSON.stringify({
            stepIds: nextSteps.map((step) => step.id),
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        const payload = await parseResponse<StepListPayload>(response);
        replaceFlavorSteps(payload.steps);
        setNotice({
          text: "Reordered the prompt pipeline.",
          tone: "success",
        });
      } catch (error) {
        setNotice({ text: getErrorMessage(error), tone: "error" });
      }
    });
  }

  return (
    <>
      <section className="page-card stack">
        <div className="split-header detail-head">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <Link className="back-link" href="/dashboard">
              <ArrowLeftIcon />
              <span>Back to flavors</span>
            </Link>
            <p className="eyebrow">Humor Flavor</p>
            <h1 className="detail-title">{flavor.slug}</h1>
            <p className="page-subtitle">{flavor.description || "No flavor description yet."}</p>
          </div>

          <div className="detail-actions">
            <button className="button" onClick={() => setIsCreateStepOpen(true)} type="button">
              <PlusIcon />
              <span>Add step</span>
            </button>
            <button className="button button-secondary" onClick={() => setIsDuplicateOpen(true)} type="button">
              <DuplicateIcon />
              <span>Duplicate</span>
            </button>
            <Link className="button button-secondary" href={`/dashboard/flavors/${flavor.id}/captions`}>
              Captions
            </Link>
            <Link className="button button-secondary" href={`/dashboard/flavors/${flavor.id}/test-runs`}>
              Test run
            </Link>
          </div>
        </div>

        {notice ? (
          <div className={`notice ${notice.tone === "error" ? "notice-error" : "notice-success"}`}>
            <strong>{notice.tone === "error" ? "Action failed" : "Saved"}</strong>
            {notice.text}
          </div>
        ) : null}

        <section className="detail-summary-card">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Slug</span>
              <span className="summary-value">{flavor.slug}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Created</span>
              <span className="summary-value">{formatDate(flavor.createdAt)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Flavor ID</span>
              <span className="summary-value">{flavor.id}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Steps</span>
              <span className="summary-value">{selectedSteps.length}</span>
            </div>
          </div>

          <div className="button-row">
            <button className="button button-ghost" onClick={() => setIsEditFlavorOpen(true)} type="button">
              Edit flavor
            </button>
            <button className="button button-danger" disabled={isDeleteFlavorPending} onClick={handleDeleteFlavor} type="button">
              {isDeleteFlavorPending ? "Deleting..." : "Delete flavor"}
            </button>
          </div>
        </section>
      </section>

      <section className="page-card stack">
        <div className="split-header">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow">Flavor Steps</p>
            <h2 className="section-title">Organize prompt pipeline</h2>
            <p className="page-subtitle">
              Drag steps to reorder them or use the controls to preview, edit, move, and delete.
            </p>
          </div>
          <span className="tiny-badge">{selectedSteps.length} step(s)</span>
        </div>

        {!hasCatalog ? (
          <div className="notice notice-error">
            <strong>Step catalog unavailable</strong>
            Step types, models, input types, or output types could not be loaded from Supabase.
          </div>
        ) : null}

        {selectedSteps.length === 0 ? (
          <div className="empty-state">
            This humor flavor does not have any steps yet. Add the first step to start shaping the prompt chain.
          </div>
        ) : (
          <div className="step-board">
            {selectedSteps.map((step, index) => (
              <article
                className={`step-row ${draggedStepId === step.id ? "step-row-dragging" : ""}`}
                draggable
                key={step.id}
                onDragEnd={() => setDraggedStepId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedStepId(step.id)}
                onDrop={() => handleDrop(step.id)}
              >
                <div className="step-row-main">
                  <span className="icon-tooltip step-drag-handle" data-tooltip="Drag to reorder">
                    <GripIcon />
                  </span>
                  <div className="step-order-chip">Step {step.order}</div>
                  <div className="stack" style={{ gap: "0.2rem" }}>
                    <p className="step-row-title">{findStepTypeLabel(initialCatalog, step)}</p>
                    {step.description ? <p className="step-row-subtitle">{step.description}</p> : null}
                  </div>
                </div>

                <div className="step-row-actions">
                  <ActionIconButton
                    disabled={isMovePending || isReorderPending || index === 0}
                    label="Move step up"
                    onClick={() => handleMoveStep(step, "up")}
                  >
                    <ArrowUpIcon />
                  </ActionIconButton>
                  <ActionIconButton
                    disabled={isMovePending || isReorderPending || index === selectedSteps.length - 1}
                    label="Move step down"
                    onClick={() => handleMoveStep(step, "down")}
                  >
                    <ArrowDownIcon />
                  </ActionIconButton>
                  <ActionIconButton label="Preview step" onClick={() => setStepBeingViewed(step)}>
                    <EyeIcon />
                  </ActionIconButton>
                  <ActionIconButton
                    disabled={!hasCatalog}
                    label="Edit step"
                    onClick={() => setStepBeingEdited(step)}
                  >
                    <PencilIcon />
                  </ActionIconButton>
                  <ActionIconButton
                    disabled={isDeleteStepPending}
                    label="Delete step"
                    onClick={() => handleDeleteStep(step)}
                    tone="danger"
                  >
                    <TrashIcon />
                  </ActionIconButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <FlavorFormModal
        description="Update the slug and description for this humor flavor."
        initialDescription={flavor.description ?? ""}
        initialSlug={flavor.slug}
        isOpen={isEditFlavorOpen}
        isPending={isSaveFlavorPending}
        key={`edit-${flavor.id}-${flavor.slug}-${isEditFlavorOpen ? "open" : "closed"}`}
        onClose={() => setIsEditFlavorOpen(false)}
        onSubmit={handleSaveFlavor}
        submitLabel="Save flavor"
        title="Edit humor flavor"
      />

      <FlavorFormModal
        description="Choose a new slug and description for the duplicate copy."
        initialDescription={flavor.description ? `Copy of ${flavor.description}` : ""}
        initialSlug={`${flavor.slug}-copy`}
        isOpen={isDuplicateOpen}
        isPending={isDuplicatePending}
        key={`duplicate-${flavor.id}-${flavor.slug}-${isDuplicateOpen ? "open" : "closed"}`}
        onClose={() => setIsDuplicateOpen(false)}
        onSubmit={handleDuplicateFlavor}
        submitLabel="Create duplicate"
        title="Duplicate flavor"
      />

      <StepFormModal
        catalog={initialCatalog}
        heading={`New step for ${formatSlugLabel(flavor.slug)}`}
        isOpen={isCreateStepOpen}
        isPending={isCreateStepPending}
        key={`create-step-${flavor.id}-${isCreateStepOpen ? "open" : "closed"}`}
        mode="create"
        onClose={() => setIsCreateStepOpen(false)}
        onSubmit={handleCreateStep}
      />

      <StepFormModal
        catalog={initialCatalog}
        heading={stepBeingEdited ? `Edit ${findStepTypeLabel(initialCatalog, stepBeingEdited)}` : "Edit step"}
        isOpen={stepBeingEdited != null}
        isPending={isSaveStepPending}
        key={`edit-step-${stepBeingEdited?.id ?? "none"}`}
        mode="edit"
        onClose={() => setStepBeingEdited(null)}
        onSubmit={handleSaveStep}
        step={stepBeingEdited}
      />

      {stepBeingViewed ? (
        <ModalShell eyebrow={`Step ${stepBeingViewed.order}`} onClose={() => setStepBeingViewed(null)} title={findStepTypeLabel(initialCatalog, stepBeingViewed)}>
          <div className="preview-grid">
            <div className="preview-card">
              <span className="summary-label">Model</span>
              <span className="summary-value">{findModelLabel(initialCatalog, stepBeingViewed)}</span>
            </div>
            <div className="preview-card">
              <span className="summary-label">Input</span>
              <span className="summary-value">{findInputLabel(initialCatalog, stepBeingViewed)}</span>
            </div>
            <div className="preview-card">
              <span className="summary-label">Output</span>
              <span className="summary-value">{findOutputLabel(initialCatalog, stepBeingViewed)}</span>
            </div>
            <div className="preview-card">
              <span className="summary-label">Temperature</span>
              <span className="summary-value">
                {stepBeingViewed.temperature == null ? "Not used" : stepBeingViewed.temperature}
              </span>
            </div>
          </div>

          <div className="stack">
            <div className="prompt-card">
              <p className="summary-label">System prompt</p>
              <pre className="prompt-copy">{stepBeingViewed.systemPrompt || "No system prompt yet."}</pre>
            </div>
            <div className="prompt-card">
              <p className="summary-label">User prompt</p>
              <pre className="prompt-copy">{stepBeingViewed.userPrompt || "No user prompt yet."}</pre>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
