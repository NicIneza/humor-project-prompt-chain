const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_API_BASE_URL = "https://api.almostcrackd.ai";
const DEFAULT_GOOGLE_CLIENT_ID =
  "388960353527-fh4grc6mla425lg0e3g1hh67omtrdihd.apps.googleusercontent.com";

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
}

export function getGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID;
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function getCaptionTableConfig() {
  return {
    captionRequestIdColumn:
      process.env.SUPABASE_CAPTION_REQUEST_ID_COLUMN ?? "caption_request_id",
    contentColumn: process.env.SUPABASE_CAPTION_CONTENT_COLUMN ?? "content",
    createdAtColumn:
      process.env.SUPABASE_CAPTION_CREATED_AT_COLUMN ?? "created_datetime_utc",
    flavorIdColumn:
      process.env.SUPABASE_CAPTION_HUMOR_FLAVOR_ID_COLUMN ?? "humor_flavor_id",
    imageIdColumn: process.env.SUPABASE_CAPTION_IMAGE_ID_COLUMN ?? "image_id",
    llmPromptChainIdColumn:
      process.env.SUPABASE_CAPTION_LLM_PROMPT_CHAIN_ID_COLUMN ?? "llm_prompt_chain_id",
    tableName: process.env.SUPABASE_CAPTIONS_TABLE ?? "captions",
  };
}

export function getImageTableConfig() {
  return {
    additionalContextColumn:
      process.env.SUPABASE_IMAGE_ADDITIONAL_CONTEXT_COLUMN ?? "additional_context",
    tableName: process.env.SUPABASE_IMAGES_TABLE ?? "images",
    urlColumn: process.env.SUPABASE_IMAGE_URL_COLUMN ?? "url",
  };
}

export function getStudyImageSetTableConfig() {
  return {
    createdAtColumn:
      process.env.SUPABASE_STUDY_IMAGE_SET_CREATED_AT_COLUMN ?? "created_datetime_utc",
    descriptionColumn:
      process.env.SUPABASE_STUDY_IMAGE_SET_DESCRIPTION_COLUMN ?? "description",
    slugColumn: process.env.SUPABASE_STUDY_IMAGE_SET_SLUG_COLUMN ?? "slug",
    tableName: process.env.SUPABASE_STUDY_IMAGE_SETS_TABLE ?? "study_image_sets",
  };
}

export function getStudyImageSetMappingTableConfig() {
  return {
    createdAtColumn:
      process.env.SUPABASE_STUDY_IMAGE_SET_MAPPING_CREATED_AT_COLUMN ?? "created_datetime_utc",
    imageIdColumn:
      process.env.SUPABASE_STUDY_IMAGE_SET_MAPPING_IMAGE_ID_COLUMN ?? "image_id",
    setIdColumn:
      process.env.SUPABASE_STUDY_IMAGE_SET_MAPPING_SET_ID_COLUMN ?? "study_image_set_id",
    tableName:
      process.env.SUPABASE_STUDY_IMAGE_SET_MAPPINGS_TABLE ??
      "study_image_set_image_mappings",
  };
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example and set both values.",
    );
  }

  return { anonKey, url };
}

export function getHumorFlavorTableConfig() {
  return {
    createdAtColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_CREATED_AT_COLUMN ?? "created_datetime_utc",
    descriptionColumn: process.env.SUPABASE_HUMOR_FLAVOR_DESCRIPTION_COLUMN ?? "description",
    ownerColumn: process.env.SUPABASE_HUMOR_FLAVOR_OWNER_COLUMN ?? "",
    slugColumn: process.env.SUPABASE_HUMOR_FLAVOR_SLUG_COLUMN ?? "slug",
    tableName: process.env.SUPABASE_HUMOR_FLAVORS_TABLE ?? "humor_flavors",
  };
}

export function getHumorFlavorStepTableConfig() {
  return {
    createdAtColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_CREATED_AT_COLUMN ?? "created_datetime_utc",
    descriptionColumn: process.env.SUPABASE_HUMOR_FLAVOR_STEP_DESCRIPTION_COLUMN ?? "description",
    flavorIdColumn: process.env.SUPABASE_HUMOR_FLAVOR_STEP_FLAVOR_ID_COLUMN ?? "humor_flavor_id",
    inputTypeIdColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_INPUT_TYPE_ID_COLUMN ?? "llm_input_type_id",
    modelIdColumn: process.env.SUPABASE_HUMOR_FLAVOR_STEP_MODEL_ID_COLUMN ?? "llm_model_id",
    orderColumn: process.env.SUPABASE_HUMOR_FLAVOR_STEP_ORDER_COLUMN ?? "order_by",
    outputTypeIdColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_OUTPUT_TYPE_ID_COLUMN ?? "llm_output_type_id",
    stepTypeIdColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_TYPE_ID_COLUMN ?? "humor_flavor_step_type_id",
    systemPromptColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_SYSTEM_PROMPT_COLUMN ?? "llm_system_prompt",
    tableName: process.env.SUPABASE_HUMOR_FLAVOR_STEPS_TABLE ?? "humor_flavor_steps",
    temperatureColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_TEMPERATURE_COLUMN ?? "llm_temperature",
    userPromptColumn:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_USER_PROMPT_COLUMN ?? "llm_user_prompt",
  };
}

export function getHumorFlavorStepCatalogConfig() {
  return {
    inputTypesTableName:
      process.env.SUPABASE_LLM_INPUT_TYPES_TABLE ?? "llm_input_types",
    modelsTableName: process.env.SUPABASE_LLM_MODELS_TABLE ?? "llm_models",
    outputTypesTableName:
      process.env.SUPABASE_LLM_OUTPUT_TYPES_TABLE ?? "llm_output_types",
    stepTypesTableName:
      process.env.SUPABASE_HUMOR_FLAVOR_STEP_TYPES_TABLE ?? "humor_flavor_step_types",
  };
}
