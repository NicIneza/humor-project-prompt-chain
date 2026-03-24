import type { SupabaseClient } from "@supabase/supabase-js";

import { getHumorFlavorStepTableConfig, getHumorFlavorTableConfig } from "@/lib/config";
import { normalizeSlug } from "@/lib/slugs";
import type { HumorFlavor, HumorFlavorStep } from "@/lib/types";

type HumorFlavorInput = {
  description: string | null;
  slug: string;
  userId?: string;
};

type HumorFlavorRecord = Record<string, unknown>;

function getSelectColumns() {
  const config = getHumorFlavorTableConfig();

  return [
    "id",
    config.slugColumn,
    config.descriptionColumn,
    config.createdAtColumn,
  ].join(", ");
}

function normalizeFlavorRecord(record: HumorFlavorRecord) {
  const config = getHumorFlavorTableConfig();

  return {
    createdAt:
      typeof record[config.createdAtColumn] === "string"
        ? (record[config.createdAtColumn] as string)
        : null,
    description:
      typeof record[config.descriptionColumn] === "string"
        ? (record[config.descriptionColumn] as string)
        : null,
    id: Number(record.id),
    slug: String(record[config.slugColumn] ?? ""),
  } satisfies HumorFlavor;
}

function normalizeCopiedStepRecord(record: Record<string, unknown>) {
  const config = getHumorFlavorStepTableConfig();

  return {
    description:
      typeof record[config.descriptionColumn] === "string"
        ? (record[config.descriptionColumn] as string)
        : null,
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
  } satisfies Omit<HumorFlavorStep, "createdAt" | "flavorId" | "id">;
}

export async function listHumorFlavors(supabase: SupabaseClient) {
  const config = getHumorFlavorTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(getSelectColumns())
    .order(config.createdAtColumn, { ascending: false });

  if (error) {
    throw new Error(`Unable to load humor flavors from ${config.tableName}: ${error.message}`);
  }

  const rows = ((data ?? []) as unknown[]) satisfies unknown[];
  return rows.map((record) => normalizeFlavorRecord(record as HumorFlavorRecord));
}

export async function getHumorFlavorById(
  supabase: SupabaseClient,
  flavorId: number,
) {
  const config = getHumorFlavorTableConfig();
  const { data, error } = await supabase
    .from(config.tableName)
    .select(getSelectColumns())
    .eq("id", flavorId)
    .single();

  if (error) {
    throw new Error(`Unable to load humor flavor ${flavorId}: ${error.message}`);
  }

  return normalizeFlavorRecord(data as unknown as HumorFlavorRecord);
}

export async function createHumorFlavor(
  supabase: SupabaseClient,
  input: HumorFlavorInput,
) {
  const config = getHumorFlavorTableConfig();
  const payload: Record<string, string | null> = {
    [config.descriptionColumn]: input.description,
    [config.slugColumn]: normalizeSlug(input.slug),
  };

  if (config.ownerColumn && input.userId) {
    payload[config.ownerColumn] = input.userId;
  }

  const { data, error } = await supabase
    .from(config.tableName)
    .insert(payload)
    .select(getSelectColumns())
    .single();

  if (error) {
    throw new Error(`Unable to create humor flavor: ${error.message}`);
  }

  return normalizeFlavorRecord(data as unknown as HumorFlavorRecord);
}

export async function updateHumorFlavor(
  supabase: SupabaseClient,
  flavorId: number,
  input: HumorFlavorInput,
) {
  const config = getHumorFlavorTableConfig();
  const payload: Record<string, string | null> = {
    [config.descriptionColumn]: input.description,
    [config.slugColumn]: normalizeSlug(input.slug),
  };

  const { data, error } = await supabase
    .from(config.tableName)
    .update(payload)
    .eq("id", flavorId)
    .select(getSelectColumns())
    .single();

  if (error) {
    throw new Error(`Unable to update humor flavor: ${error.message}`);
  }

  return normalizeFlavorRecord(data as unknown as HumorFlavorRecord);
}

export async function duplicateHumorFlavor(
  supabase: SupabaseClient,
  sourceFlavorId: number,
  input: HumorFlavorInput,
) {
  const stepConfig = getHumorFlavorStepTableConfig();
  const sourceFlavor = await getHumorFlavorById(supabase, sourceFlavorId);
  const nextFlavor = await createHumorFlavor(supabase, input);

  try {
    const { data, error } = await supabase
      .from(stepConfig.tableName)
      .select(
        [
          stepConfig.descriptionColumn,
          stepConfig.inputTypeIdColumn,
          stepConfig.modelIdColumn,
          stepConfig.orderColumn,
          stepConfig.outputTypeIdColumn,
          stepConfig.stepTypeIdColumn,
          stepConfig.systemPromptColumn,
          stepConfig.temperatureColumn,
          stepConfig.userPromptColumn,
        ].join(", "),
      )
      .eq(stepConfig.flavorIdColumn, sourceFlavor.id)
      .order(stepConfig.orderColumn, { ascending: true });

    if (error) {
      throw new Error(`Unable to load source steps for flavor ${sourceFlavorId}: ${error.message}`);
    }

    const copiedSteps = ((data ?? []) as unknown as Record<string, unknown>[]).map((record) =>
      normalizeCopiedStepRecord(record),
    );

    if (copiedSteps.length === 0) {
      return nextFlavor;
    }

    const payloads = copiedSteps.map((step) => ({
      [stepConfig.descriptionColumn]: step.description,
      [stepConfig.flavorIdColumn]: nextFlavor.id,
      [stepConfig.inputTypeIdColumn]: step.inputTypeId,
      [stepConfig.modelIdColumn]: step.modelId,
      [stepConfig.orderColumn]: step.order,
      [stepConfig.outputTypeIdColumn]: step.outputTypeId,
      [stepConfig.stepTypeIdColumn]: step.stepTypeId,
      [stepConfig.systemPromptColumn]: step.systemPrompt.trim(),
      [stepConfig.temperatureColumn]: step.temperature,
      [stepConfig.userPromptColumn]: step.userPrompt.trim(),
    }));

    const { error: insertError } = await supabase.from(stepConfig.tableName).insert(payloads);

    if (insertError) {
      throw new Error(`Unable to copy humor flavor steps: ${insertError.message}`);
    }

    return nextFlavor;
  } catch (error) {
    await deleteHumorFlavor(supabase, nextFlavor.id).catch(() => undefined);
    throw error;
  }
}

export async function deleteHumorFlavor(supabase: SupabaseClient, flavorId: number) {
  const flavorConfig = getHumorFlavorTableConfig();
  const stepConfig = getHumorFlavorStepTableConfig();

  const { error: stepDeleteError } = await supabase
    .from(stepConfig.tableName)
    .delete()
    .eq(stepConfig.flavorIdColumn, flavorId);

  if (stepDeleteError) {
    throw new Error(`Unable to delete humor flavor steps: ${stepDeleteError.message}`);
  }

  const { error } = await supabase.from(flavorConfig.tableName).delete().eq("id", flavorId);

  if (error) {
    throw new Error(`Unable to delete humor flavor: ${error.message}`);
  }
}
