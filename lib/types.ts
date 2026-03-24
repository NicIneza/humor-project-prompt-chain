export type HumorFlavor = {
  createdAt: string | null;
  description: string | null;
  id: number;
  slug: string;
};

export type HumorFlavorListItem = HumorFlavor & {
  stepCount: number;
};

export type HumorFlavorStep = {
  createdAt: string | null;
  description: string | null;
  flavorId: number;
  id: number;
  inputTypeId: number | null;
  modelId: number | null;
  order: number;
  outputTypeId: number | null;
  stepTypeId: number | null;
  systemPrompt: string;
  temperature: number | null;
  userPrompt: string;
};

export type StepTypeOption = {
  createdAt: string | null;
  description: string | null;
  id: number;
  slug: string;
};

export type InputTypeOption = {
  createdAt: string | null;
  description: string | null;
  id: number;
  slug: string;
};

export type OutputTypeOption = {
  createdAt: string | null;
  description: string | null;
  id: number;
  slug: string;
};

export type ModelOption = {
  id: number;
  isTemperatureSupported: boolean;
  name: string;
  providerId: number | null;
  providerModelId: string | null;
};

export type StepCatalog = {
  inputTypes: InputTypeOption[];
  models: ModelOption[];
  outputTypes: OutputTypeOption[];
  stepTypes: StepTypeOption[];
};

export type ProfileSummary = {
  id: string;
  is_matrix_admin: boolean | null;
  is_superadmin: boolean | null;
};

export type CachedCaption = {
  captionRequestId: string | null;
  captionText: string | null;
  createdAt: string;
  flavorId: number;
  flavorSlug: string;
  id: string;
  imageId: string | null;
  imageName: string;
  imageUrl: string | null;
  llmPromptChainId: string | null;
  rawResponse: unknown;
  runId: string;
};

export type CachedTestRunImage = {
  captionIds: string[];
  error: string | null;
  imageId: string | null;
  imageName: string;
  imageUrl: string | null;
  status: "completed" | "failed";
};

export type CachedTestRun = {
  createdAt: string;
  flavorId: number;
  flavorSlug: string;
  id: string;
  images: CachedTestRunImage[];
  name: string;
};

export type StudyImageSetImage = {
  id: string;
  imageName: string;
  imageUrl: string | null;
};

export type StudyImageSet = {
  createdAt: string | null;
  description: string | null;
  id: number;
  imageCount: number;
  images: StudyImageSetImage[];
  slug: string;
};
