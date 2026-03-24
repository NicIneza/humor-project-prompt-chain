"use client";

import { useState } from "react";

import { ModalShell } from "@/components/dashboard/modal-shell";
import type { HumorFlavorStep, StepCatalog } from "@/lib/types";

export type StepDraft = {
  description: string;
  inputTypeId: number | null;
  modelId: number | null;
  outputTypeId: number | null;
  stepTypeId: number | null;
  systemPrompt: string;
  temperature: number | null;
  userPrompt: string;
};

type StepFormModalProps = {
  catalog: StepCatalog;
  heading: string;
  isOpen: boolean;
  isPending: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (draft: StepDraft) => void;
  step?: HumorFlavorStep | null;
};

function findDefaultModelId(catalog: StepCatalog) {
  return catalog.models.find((model) => model.name === "GPT-4.1-mini")?.id ?? catalog.models[0]?.id ?? null;
}

function buildDefaults(catalog: StepCatalog, step?: HumorFlavorStep | null) {
  if (step) {
    return {
      description: step.description ?? "",
      inputTypeId: step.inputTypeId,
      modelId: step.modelId,
      outputTypeId: step.outputTypeId,
      stepTypeId: step.stepTypeId,
      systemPrompt: step.systemPrompt,
      temperature: step.temperature,
      userPrompt: step.userPrompt,
    } satisfies StepDraft;
  }

  return {
    description: "",
    inputTypeId:
      catalog.inputTypes.find((option) => option.slug === "image-and-text")?.id ??
      catalog.inputTypes.find((option) => option.slug === "text-only")?.id ??
      catalog.inputTypes[0]?.id ??
      null,
    modelId: findDefaultModelId(catalog),
    outputTypeId:
      catalog.outputTypes.find((option) => option.slug === "string")?.id ??
      catalog.outputTypes[0]?.id ??
      null,
    stepTypeId:
      catalog.stepTypes.find((option) => option.slug === "general")?.id ??
      catalog.stepTypes[0]?.id ??
      null,
    systemPrompt: "",
    temperature: 1,
    userPrompt: "",
  } satisfies StepDraft;
}

function formatSlugLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function StepFormModal({
  catalog,
  heading,
  isOpen,
  isPending,
  mode,
  onClose,
  onSubmit,
  step,
}: StepFormModalProps) {
  const defaults = buildDefaults(catalog, step);

  const [draftDescription, setDraftDescription] = useState(defaults.description);
  const [draftInputTypeId, setDraftInputTypeId] = useState(defaults.inputTypeId ? String(defaults.inputTypeId) : "");
  const [draftModelId, setDraftModelId] = useState(defaults.modelId ? String(defaults.modelId) : "");
  const [draftOutputTypeId, setDraftOutputTypeId] = useState(defaults.outputTypeId ? String(defaults.outputTypeId) : "");
  const [draftStepTypeId, setDraftStepTypeId] = useState(defaults.stepTypeId ? String(defaults.stepTypeId) : "");
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(defaults.systemPrompt);
  const [draftTemperature, setDraftTemperature] = useState(defaults.temperature == null ? "" : String(defaults.temperature));
  const [draftUserPrompt, setDraftUserPrompt] = useState(defaults.userPrompt);

  if (!isOpen) {
    return null;
  }

  const selectedModelId = draftModelId ? Number(draftModelId) : null;
  const selectedModel = catalog.models.find((model) => model.id === selectedModelId) ?? null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      description: draftDescription,
      inputTypeId: draftInputTypeId ? Number(draftInputTypeId) : null,
      modelId: draftModelId ? Number(draftModelId) : null,
      outputTypeId: draftOutputTypeId ? Number(draftOutputTypeId) : null,
      stepTypeId: draftStepTypeId ? Number(draftStepTypeId) : null,
      systemPrompt: draftSystemPrompt,
      temperature:
        draftTemperature === "" || !selectedModel?.isTemperatureSupported ? null : Number(draftTemperature),
      userPrompt: draftUserPrompt,
    });
  }

  return (
    <ModalShell eyebrow={mode === "create" ? "New Step" : "Edit Step"} onClose={onClose} title={heading}>
      <p className="modal-copy">
        Choose the model, types, and prompts for this pipeline step.
      </p>

      <form className="stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-compact">
          <div className="field">
            <label htmlFor={`${mode}-input-type`}>Input type</label>
            <select
              className="select"
              id={`${mode}-input-type`}
              onChange={(event) => setDraftInputTypeId(event.target.value)}
              value={draftInputTypeId}
            >
              <option value="">Select an input type</option>
              {catalog.inputTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.description ?? formatSlugLabel(option.slug)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor={`${mode}-output-type`}>Output type</label>
            <select
              className="select"
              id={`${mode}-output-type`}
              onChange={(event) => setDraftOutputTypeId(event.target.value)}
              value={draftOutputTypeId}
            >
              <option value="">Select an output type</option>
              {catalog.outputTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.description ?? formatSlugLabel(option.slug)}
                </option>
              ))}
            </select>
          </div>

          <div className="field field-span-2">
            <label htmlFor={`${mode}-model`}>LLM model</label>
            <select
              className="select"
              id={`${mode}-model`}
              onChange={(event) => setDraftModelId(event.target.value)}
              value={draftModelId}
            >
              <option value="">Select a model</option>
              {catalog.models.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field field-span-2">
            <label htmlFor={`${mode}-step-type`}>Step type</label>
            <select
              className="select"
              id={`${mode}-step-type`}
              onChange={(event) => setDraftStepTypeId(event.target.value)}
              value={draftStepTypeId}
            >
              <option value="">Select a step type</option>
              {catalog.stepTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {formatSlugLabel(option.slug)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor={`${mode}-temperature`}>Temperature</label>
            <input
              className="input"
              disabled={!selectedModel?.isTemperatureSupported}
              id={`${mode}-temperature`}
              max="2"
              min="0"
              onChange={(event) => setDraftTemperature(event.target.value)}
              placeholder={selectedModel?.isTemperatureSupported ? "1.0" : "Disabled for this model"}
              step="0.1"
              type="number"
              value={draftTemperature}
            />
            <p className="field-hint">
              {selectedModel?.isTemperatureSupported ? "Use 0 to 2." : "Temperature is disabled for this model."}
            </p>
          </div>

          <div className="field">
            <label htmlFor={`${mode}-description`}>Step description</label>
            <input
              className="input"
              id={`${mode}-description`}
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="Document the job of this step."
              value={draftDescription}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${mode}-system-prompt`}>System prompt</label>
          <textarea
            className="textarea textarea-xl"
            id={`${mode}-system-prompt`}
            onChange={(event) => setDraftSystemPrompt(event.target.value)}
            placeholder="Write system-level instructions..."
            value={draftSystemPrompt}
          />
        </div>

        <div className="field">
          <label htmlFor={`${mode}-user-prompt`}>User prompt</label>
          <textarea
            className="textarea textarea-xl"
            id={`${mode}-user-prompt`}
            onChange={(event) => setDraftUserPrompt(event.target.value)}
            placeholder="Write user-facing instructions..."
            value={draftUserPrompt}
          />
        </div>

        <div className="button-row button-row-end">
          <button className="button button-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="button" disabled={isPending} type="submit">
            {isPending ? "Saving..." : mode === "create" ? "Add step" : "Save step"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
