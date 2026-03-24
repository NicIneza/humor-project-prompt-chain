import type { SupabaseClient } from "@supabase/supabase-js";

import { getHumorFlavorStepCatalogConfig } from "@/lib/config";
import type {
  InputTypeOption,
  ModelOption,
  OutputTypeOption,
  StepCatalog,
  StepTypeOption,
} from "@/lib/types";

type CatalogRecord = Record<string, unknown>;

function normalizeOptionRecord(record: CatalogRecord) {
  return {
    createdAt:
      typeof record.created_datetime_utc === "string"
        ? (record.created_datetime_utc as string)
        : typeof record.created_at === "string"
          ? (record.created_at as string)
          : null,
    description: typeof record.description === "string" ? (record.description as string) : null,
    id: Number(record.id),
    slug: String(record.slug ?? ""),
  };
}

function normalizeModelRecord(record: CatalogRecord) {
  return {
    id: Number(record.id),
    isTemperatureSupported: Boolean(record.is_temperature_supported),
    name: String(record.name ?? ""),
    providerId:
      typeof record.llm_provider_id === "number" ? (record.llm_provider_id as number) : null,
    providerModelId:
      typeof record.provider_model_id === "string"
        ? (record.provider_model_id as string)
        : null,
  } satisfies ModelOption;
}

export async function listStepCatalog(supabase: SupabaseClient) {
  const config = getHumorFlavorStepCatalogConfig();

  const [stepTypesResult, inputTypesResult, outputTypesResult, modelsResult] = await Promise.all([
    supabase
      .from(config.stepTypesTableName)
      .select("id, created_at, description, slug")
      .order("id", { ascending: true }),
    supabase
      .from(config.inputTypesTableName)
      .select("id, created_datetime_utc, description, slug")
      .order("id", { ascending: true }),
    supabase
      .from(config.outputTypesTableName)
      .select("id, created_datetime_utc, description, slug")
      .order("id", { ascending: true }),
    supabase
      .from(config.modelsTableName)
      .select("id, is_temperature_supported, llm_provider_id, name, provider_model_id")
      .order("id", { ascending: true }),
  ]);

  if (stepTypesResult.error) {
    throw new Error(`Unable to load humor flavor step types: ${stepTypesResult.error.message}`);
  }

  if (inputTypesResult.error) {
    throw new Error(`Unable to load LLM input types: ${inputTypesResult.error.message}`);
  }

  if (outputTypesResult.error) {
    throw new Error(`Unable to load LLM output types: ${outputTypesResult.error.message}`);
  }

  if (modelsResult.error) {
    throw new Error(`Unable to load LLM models: ${modelsResult.error.message}`);
  }

  return {
    inputTypes: ((inputTypesResult.data ?? []) as CatalogRecord[]).map(
      (record) => normalizeOptionRecord(record) satisfies InputTypeOption,
    ),
    models: ((modelsResult.data ?? []) as CatalogRecord[]).map((record) =>
      normalizeModelRecord(record),
    ),
    outputTypes: ((outputTypesResult.data ?? []) as CatalogRecord[]).map(
      (record) => normalizeOptionRecord(record) satisfies OutputTypeOption,
    ),
    stepTypes: ((stepTypesResult.data ?? []) as CatalogRecord[]).map(
      (record) => normalizeOptionRecord(record) satisfies StepTypeOption,
    ),
  } satisfies StepCatalog;
}
