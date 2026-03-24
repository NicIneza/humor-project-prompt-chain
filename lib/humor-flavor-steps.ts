import type { SupabaseClient } from "@supabase/supabase-js";

import { getHumorFlavorStepTableConfig } from "@/lib/config";
import type { HumorFlavorStep } from "@/lib/types";

type HumorFlavorStepInput = {
  description: string | null;
  inputTypeId: number | null;
  modelId: number | null;
  outputTypeId: number | null;
  stepTypeId: number | null;
  systemPrompt: string;
  temperature: number | null;
  userPrompt: string;
};

type StepMoveDirection = "down" | "up";

type HumorFlavorStepRecord = Record<string, unknown>;

const STEP_ORDER_MAX = 32767;

function getSelectColumns() {
  const config = getHumorFlavorStepTableConfig();

  return [
    "id",
    config.createdAtColumn,
    config.descriptionColumn,
    config.flavorIdColumn,
    config.inputTypeIdColumn,
    config.modelIdColumn,
    config.orderColumn,
    config.outputTypeIdColumn,
    config.stepTypeIdColumn,
    config.systemPromptColumn,
    config.temperatureColumn,
    config.userPromptColumn,
  ].join(", ");
}

function normalizeStepRecord(record: HumorFlavorStepRecord) {
  const config = getHumorFlavorStepTableConfig();

  return {
    createdAt:
      typeof record[config.createdAtColumn] === "string"
        ? (record[config.createdAtColumn] as string)
        : null,
    description:
      typeof record[config.descriptionColumn] === "string"
        ? (record[config.descriptionColumn] as string)
        : null,
    flavorId: Number(record[config.flavorIdColumn]),
    id: Number(record.id),
    inputTypeId:
      typeof record[config.inputTypeIdColumn] === "number"
        ? (record[config.inputTypeIdColumn] as number)
        : null,
    modelId:
      typeof record[config.modelIdColumn] === "number"
        ? (record[config.modelIdColumn] as number)
        : null,
    order:
      typeof record[config.orderColumn] === "number"
        ? (record[config.orderColumn] as number)
        : 0,
    outputTypeId:
      typeof record[config.outputTypeIdColumn] === "number"
        ? (record[config.outputTypeIdColumn] as number)
        : null,
    stepTypeId:
      typeof record[config.stepTypeIdColumn] === "number"
        ? (record[config.stepTypeIdColumn] as number)
        : null,
    systemPrompt:
      typeof record[config.systemPromptColumn] === "string"
        ? (record[config.systemPromptColumn] as string)
        : "",
    temperature:
      typeof record[config.temperatureColumn] === "number"
        ? (record[config.temperatureColumn] as number)
        : null,
    userPrompt:
      typeof record[config.userPromptColumn] === "string"
        ? (record[config.userPromptColumn] as string)
        : "",
  } satisfies HumorFlavorStep;
}

function buildPayload(input: HumorFlavorStepInput) {
  const config = getHumorFlavorStepTableConfig();

  return {
    [config.descriptionColumn]: input.description,
    [config.inputTypeIdColumn]: input.inputTypeId,
    [config.modelIdColumn]: input.modelId,
    [config.outputTypeIdColumn]: input.outputTypeId,
    [config.stepTypeIdColumn]: input.stepTypeId,
    [config.systemPromptColumn]: input.systemPrompt.trim(),
    [config.temperatureColumn]: input.temperature,
    [config.userPromptColumn]: input.userPrompt.trim(),
  } satisfies Record<string, number | string | null>;
}

async function getStepById(supabase: SupabaseClient, stepId: number) {
  const config = getHumorFlavorStepTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(getSelectColumns())
    .eq("id", stepId)
    .single();

  if (error) {
    throw new Error(`Unable to load humor flavor step ${stepId}: ${error.message}`);
  }

  return normalizeStepRecord(data as unknown as HumorFlavorStepRecord);
}

async function updateStepOrder(
  supabase: SupabaseClient,
  stepId: number,
  nextOrder: number,
) {
  const config = getHumorFlavorStepTableConfig();
  const { error } = await supabase
    .from(config.tableName)
    .update({ [config.orderColumn]: nextOrder })
    .eq("id", stepId);

  if (error) {
    throw new Error(`Unable to update humor flavor step order: ${error.message}`);
  }
}

async function normalizeFlavorStepOrders(
  supabase: SupabaseClient,
  flavorId: number,
) {
  const config = getHumorFlavorStepTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(getSelectColumns())
    .eq(config.flavorIdColumn, flavorId)
    .order(config.orderColumn, { ascending: true });

  if (error) {
    throw new Error(`Unable to reload humor flavor steps: ${error.message}`);
  }

  const steps = ((data ?? []) as unknown as HumorFlavorStepRecord[]).map((record) =>
    normalizeStepRecord(record),
  );

  const updates = steps
    .map((step, index) => ({ nextOrder: index + 1, step }))
    .filter(({ nextOrder, step }) => step.order !== nextOrder);

  for (const { nextOrder, step } of updates) {
    await updateStepOrder(supabase, step.id, nextOrder);
  }

  if (updates.length === 0) {
    return steps;
  }

  return listHumorFlavorStepsForFlavor(supabase, flavorId);
}

async function getNextStepOrder(supabase: SupabaseClient, flavorId: number) {
  const config = getHumorFlavorStepTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(config.orderColumn)
    .eq(config.flavorIdColumn, flavorId)
    .order(config.orderColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to determine next humor flavor step order: ${error.message}`);
  }

  const typedData = data as Record<string, unknown> | null;
  const currentOrder =
    typedData && typeof typedData[config.orderColumn] === "number"
      ? (typedData[config.orderColumn] as number)
      : 0;

  const nextOrder = currentOrder + 1;

  if (nextOrder > STEP_ORDER_MAX) {
    throw new Error("Unable to create another humor flavor step: the step order exceeds the smallint limit.");
  }

  return nextOrder;
}

export async function listHumorFlavorSteps(supabase: SupabaseClient) {
  const config = getHumorFlavorStepTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(getSelectColumns())
    .order(config.flavorIdColumn, { ascending: true })
    .order(config.orderColumn, { ascending: true });

  if (error) {
    throw new Error(`Unable to load humor flavor steps: ${error.message}`);
  }

  return ((data ?? []) as unknown as HumorFlavorStepRecord[]).map((record) =>
    normalizeStepRecord(record),
  );
}

export async function listHumorFlavorStepsForFlavor(
  supabase: SupabaseClient,
  flavorId: number,
) {
  const config = getHumorFlavorStepTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(getSelectColumns())
    .eq(config.flavorIdColumn, flavorId)
    .order(config.orderColumn, { ascending: true });

  if (error) {
    throw new Error(`Unable to load humor flavor steps for flavor ${flavorId}: ${error.message}`);
  }

  return ((data ?? []) as unknown as HumorFlavorStepRecord[]).map((record) =>
    normalizeStepRecord(record),
  );
}

export async function createHumorFlavorStep(
  supabase: SupabaseClient,
  flavorId: number,
  input: HumorFlavorStepInput,
) {
  const config = getHumorFlavorStepTableConfig();
  const nextOrder = await getNextStepOrder(supabase, flavorId);
  const payload = {
    ...buildPayload(input),
    [config.flavorIdColumn]: flavorId,
    [config.orderColumn]: nextOrder,
  } satisfies Record<string, number | string | null>;

  const { data, error } = await supabase
    .from(config.tableName)
    .insert(payload)
    .select(getSelectColumns())
    .single();

  if (error) {
    throw new Error(`Unable to create humor flavor step: ${error.message}`);
  }

  return normalizeStepRecord(data as unknown as HumorFlavorStepRecord);
}

export async function updateHumorFlavorStep(
  supabase: SupabaseClient,
  stepId: number,
  input: HumorFlavorStepInput,
) {
  const config = getHumorFlavorStepTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .update(buildPayload(input))
    .eq("id", stepId)
    .select(getSelectColumns())
    .single();

  if (error) {
    throw new Error(`Unable to update humor flavor step: ${error.message}`);
  }

  return normalizeStepRecord(data as unknown as HumorFlavorStepRecord);
}

export async function deleteHumorFlavorStep(
  supabase: SupabaseClient,
  stepId: number,
) {
  const step = await getStepById(supabase, stepId);
  const config = getHumorFlavorStepTableConfig();
  const { error } = await supabase.from(config.tableName).delete().eq("id", stepId);

  if (error) {
    throw new Error(`Unable to delete humor flavor step: ${error.message}`);
  }

  const steps = await normalizeFlavorStepOrders(supabase, step.flavorId);
  return {
    flavorId: step.flavorId,
    steps,
  };
}

export async function moveHumorFlavorStep(
  supabase: SupabaseClient,
  stepId: number,
  direction: StepMoveDirection,
) {
  const step = await getStepById(supabase, stepId);
  const normalizedSteps = await normalizeFlavorStepOrders(supabase, step.flavorId);
  const currentIndex = normalizedSteps.findIndex((entry) => entry.id === stepId);

  if (currentIndex < 0) {
    throw new Error(`Unable to move humor flavor step ${stepId}: the step could not be found.`);
  }

  const neighborIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const neighbor = normalizedSteps[neighborIndex];

  if (!neighbor) {
    return {
      flavorId: step.flavorId,
      steps: normalizedSteps,
    };
  }

  const currentStep = normalizedSteps[currentIndex];
  const tempOrder = normalizedSteps.length + 1;

  if (tempOrder > STEP_ORDER_MAX) {
    throw new Error("Unable to move humor flavor step: the temporary step order exceeds the smallint limit.");
  }

  await updateStepOrder(supabase, currentStep.id, tempOrder);
  await updateStepOrder(supabase, neighbor.id, currentStep.order);
  await updateStepOrder(supabase, currentStep.id, neighbor.order);

  return {
    flavorId: step.flavorId,
    steps: await listHumorFlavorStepsForFlavor(supabase, step.flavorId),
  };
}

export async function reorderHumorFlavorSteps(
  supabase: SupabaseClient,
  flavorId: number,
  orderedStepIds: number[],
) {
  const existingSteps = await normalizeFlavorStepOrders(supabase, flavorId);

  if (existingSteps.length !== orderedStepIds.length) {
    throw new Error("The submitted step order does not match the stored step count.");
  }

  const existingIds = new Set(existingSteps.map((step) => step.id));

  if (orderedStepIds.some((stepId) => !existingIds.has(stepId))) {
    throw new Error("The submitted step order includes an unknown step.");
  }

  const temporaryOrderStart = existingSteps.length + 1;
  const temporaryOrderEnd = temporaryOrderStart + orderedStepIds.length - 1;

  if (temporaryOrderEnd > STEP_ORDER_MAX) {
    throw new Error("Unable to reorder humor flavor steps: the temporary step order exceeds the smallint limit.");
  }

  for (const [index, stepId] of orderedStepIds.entries()) {
    await updateStepOrder(supabase, stepId, temporaryOrderStart + index);
  }

  for (const [index, stepId] of orderedStepIds.entries()) {
    await updateStepOrder(supabase, stepId, index + 1);
  }

  return {
    flavorId,
    steps: await listHumorFlavorStepsForFlavor(supabase, flavorId),
  };
}
