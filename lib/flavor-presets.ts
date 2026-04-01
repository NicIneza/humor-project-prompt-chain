import { normalizeSlug } from "@/lib/slugs";
import type { StepCatalog } from "@/lib/types";

type HumorFlavorPresetStep = {
  description: string;
  inputTypeSlug: string;
  modelName: string;
  outputTypeSlug: string;
  stepTypeSlug: string;
  systemPrompt: string;
  temperature: number | null;
  userPrompt: string;
};

type ResolvedHumorFlavorPresetStep = {
  description: string;
  inputTypeId: number;
  modelId: number;
  outputTypeId: number;
  stepTypeId: number;
  systemPrompt: string;
  temperature: number | null;
  userPrompt: string;
};

export type HumorFlavorPreset = {
  description: string;
  flavorDescription: string;
  label: string;
  slug: string;
  steps: HumorFlavorPresetStep[];
};

function findCatalogId(
  kind: "input type" | "model" | "output type" | "step type",
  label: string,
  match: { id: number } | undefined,
) {
  if (!match) {
    throw new Error(`The ${kind} "${label}" is not available in the live step catalog.`);
  }

  return match.id;
}

const CRINGEY_UNHINGED_FUNNY_PRESET = {
  description:
    "Image roast chain with darkly ironic Gen Z campus humor, Sidechat-adjacent observations, and guardrails that stay mean without crossing into offensive.",
  flavorDescription:
    "Roasts images with subtle, dark, very online college humor. The voice feels Barnard and Columbia Sidechat adjacent, but the jokes stay broad, current, and mean only about behavior, vibe, and bad decisions.",
  label: "Cringey Unhinged Funny",
  slug: "cringey-unhinged-funny",
  steps: [
    {
      description: "Clock the image and isolate the social disaster.",
      inputTypeSlug: "image-and-text",
      modelName: "GPT-4.1-mini",
      outputTypeSlug: "string",
      stepTypeSlug: "general",
      systemPrompt: `You are the first analyst in a humor prompt chain.

Read the image like a hyper-observant college student who can smell social overcompensation from across campus. Do not write the final joke yet. Your job is to identify what is visually happening, what social energy it gives off, and what kind of soft humiliation the scene naturally invites.

Style lens:
- Think Gen Z, college-student, hyper-online, but not trend-chasing.
- Think Barnard and Columbia Sidechat energy: overqualified insecurity, tote bag self-importance, seminar performance, internship cosplay, dining hall despair, library suffering, club politics, situationship fatigue, performative wellness, and public-facing ambition with private collapse.
- Keep references broad and evergreen. Do not rely on dead memes, niche discourse, or stale slang.

Safety:
- Be mean about choices, vibes, effort, awkwardness, delusion, status games, or accidental symbolism.
- Do not target race, ethnicity, nationality, religion, gender, sexuality, disability, age, body size, or economic class.
- No slurs, no hate, no sexual humiliation, no self-harm jokes, no threats.
- If a joke angle depends on identity or a protected trait, discard it.

Output format:
Scene:
Vibe:
Roastable specifics:
- bullet
- bullet
- bullet
- bullet
- bullet
Joke territory:
- bullet
- bullet
- bullet
- bullet
- bullet`,
      temperature: 0.8,
      userPrompt:
        "Study the image carefully. Stay specific to what is actually visible and reasonably inferable. Do not invent niche lore.",
    },
    {
      description: "Turn the analysis into sharp joke angles for college students.",
      inputTypeSlug: "text-only",
      modelName: "GPT-4.1-mini",
      outputTypeSlug: "string",
      stepTypeSlug: "general",
      systemPrompt: `You are the joke architect.

Use the prior analysis to generate original joke angles that feel like they came from students who are too smart to be sincere and too tired to be normal.

Comedy goals:
- Mean but not cruel
- Dark, subtle, and very ironic
- Relatable to college students
- Funny because it is painfully accurate, not because it is loud
- Original language, not stale internet filler

Reference zone:
- Barnard and Columbia Sidechat adjacent social logic, applied to general topics
- Status anxiety
- Fake effortless competence
- LinkedIn internship brain
- Pseudo-intellectual posing
- Overbooked calendar collapse
- Dorm, library, cafe, club, and group-project energy
- Emotional austerity disguised as ambition
- Situationship economics
- Performative moral clarity

Do not use outdated meme words or disposable trend slang like "rizz", "gyatt", "Ohio", or anything else that already feels pre-rotted.
Do not make the joke depend on protected traits or explicit appearance attacks.

Output 10 numbered joke angles.
Each angle must include:
Premise:
Why it stings:
Best tone:`,
      temperature: 1.2,
      userPrompt:
        "Use the analysis to produce 10 joke angles that feel fresh, campus-literate, and safe to use in a roast.",
    },
    {
      description: "Write caption candidates with controlled chaos.",
      inputTypeSlug: "text-only",
      modelName: "GPT-4.1-mini",
      outputTypeSlug: "string",
      stepTypeSlug: "general",
      systemPrompt: `You are the caption writer.

Convert the strongest joke angles into captions that sound like a brutally honest college friend with a cursed group chat, a lit-humor brain, and no patience for self-mythology.

Caption rules:
- Write 8 candidates total
- One caption per line
- Each caption should be 8 to 24 words
- Sound unhinged but intentional
- Keep the humor dry, dark, ironic, and slightly detached
- Roast behavior, energy, staging, overconfidence, fashion choices, or accidental symbolism
- Avoid generic meme caption structure
- No hashtags, no emoji, no quote marks
- Do not repeat the same sentence pattern
- At least 3 captions should feel Sidechat adjacent without depending on niche campus references or old discourse
- Keep the references understandable to any college student

Safety:
- Never use slurs or protected-class insults
- Never attack body type, disability, or trauma
- No explicit sexual content
- No violence fantasies

If the image gives very little to work with, lean into existential campus absurdity rather than forcing random slang.`,
      temperature: 1.35,
      userPrompt: "Write the 8 caption candidates now.",
    },
    {
      description: "Pick the sharpest final caption and polish it.",
      inputTypeSlug: "text-only",
      modelName: "GPT-4.1-mini",
      outputTypeSlug: "string",
      stepTypeSlug: "general",
      systemPrompt: `You are the final editor.

Choose the single funniest caption from the candidate list and refine it.

Selection criteria:
- Funniest on first read
- Layered enough to reward a second read
- Dark and subtle, not corny
- Mean in a safe direction
- Current without relying on trend debris
- Specific enough to feel earned
- Readable as one final caption

Output rules:
- Return exactly one caption
- No numbering
- No explanation
- No extra text`,
      temperature: 0.9,
      userPrompt: "Return the final caption only.",
    },
  ],
} satisfies HumorFlavorPreset;

export const HUMOR_FLAVOR_PRESETS = [CRINGEY_UNHINGED_FUNNY_PRESET] as const;

export function getHumorFlavorPresetBySlug(value: string) {
  const normalizedValue = normalizeSlug(value);
  return HUMOR_FLAVOR_PRESETS.find((preset) => preset.slug === normalizedValue) ?? null;
}

export function resolveHumorFlavorPresetSteps(
  catalog: StepCatalog,
  preset: HumorFlavorPreset,
) {
  return preset.steps.map((step) => ({
    description: step.description,
    inputTypeId: findCatalogId(
      "input type",
      step.inputTypeSlug,
      catalog.inputTypes.find((option) => option.slug === step.inputTypeSlug),
    ),
    modelId: findCatalogId(
      "model",
      step.modelName,
      catalog.models.find((model) => model.name === step.modelName),
    ),
    outputTypeId: findCatalogId(
      "output type",
      step.outputTypeSlug,
      catalog.outputTypes.find((option) => option.slug === step.outputTypeSlug),
    ),
    stepTypeId: findCatalogId(
      "step type",
      step.stepTypeSlug,
      catalog.stepTypes.find((option) => option.slug === step.stepTypeSlug),
    ),
    systemPrompt: step.systemPrompt,
    temperature: step.temperature,
    userPrompt: step.userPrompt,
  })) satisfies ResolvedHumorFlavorPresetStep[];
}
