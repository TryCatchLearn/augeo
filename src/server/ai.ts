import { createGateway } from "@ai-sdk/gateway";
import { generateObject, streamText } from "ai";
import type { ZodType } from "zod";
import {
  type DescriptionEnhancerTone,
  smartListingCreatorSchema,
} from "@/features/listings/schema";
import { getRequiredEnv } from "@/lib/env";

const primaryModelId = "google/gemini-2.5-flash-lite";
const fallbackModelId = "openai/gpt-4o-mini";

export type GenerateStructuredObjectOptions<TSchema extends ZodType> = {
  modelId: string;
  schema: TSchema;
  schemaName: string;
  system: string;
  prompt: string;
  imageUrls?: string[];
};

export interface AiAdapter {
  generateStructuredObject<TSchema extends ZodType>(
    options: GenerateStructuredObjectOptions<TSchema>,
  ): Promise<import("zod").infer<TSchema>>;
  streamText?(options: GenerateTextOptions): AsyncIterable<string>;
}

export type GenerateTextOptions = {
  modelId: string;
  system: string;
  prompt: string;
};

class GatewayAiAdapter implements AiAdapter {
  async generateStructuredObject<TSchema extends ZodType>(
    options: GenerateStructuredObjectOptions<TSchema>,
  ): Promise<import("zod").infer<TSchema>> {
    const gateway = createGateway({
      apiKey: getRequiredEnv("AI_GATEWAY_API_KEY"),
    });

    const result = await generateObject({
      model: gateway(options.modelId),
      schema: options.schema,
      schemaName: options.schemaName,
      system: options.system,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            ...(options.imageUrls?.map((imageUrl) => ({
              type: "image" as const,
              image: imageUrl,
            })) ?? []),
          ],
        },
      ],
    });

    return result.object as import("zod").infer<TSchema>;
  }

  streamText(options: GenerateTextOptions): AsyncIterable<string> {
    const gateway = createGateway({
      apiKey: getRequiredEnv("AI_GATEWAY_API_KEY"),
    });

    const result = streamText({
      model: gateway(options.modelId),
      system: options.system,
      prompt: options.prompt,
    });

    return result.textStream;
  }
}

export class AiGenerationError extends Error {
  constructor(
    message = "AI generation failed.",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AiGenerationError";
  }
}

const defaultAdapter = new GatewayAiAdapter();

function buildSmartListingCreatorSystemPrompt() {
  return [
    "You create auction draft suggestions from a single product image.",
    "Return concise, seller-friendly copy and classification data.",
    "Do not invent accessories, defects, provenance, specs, dimensions, or condition details that are not visible in the image.",
    "If the category is uncertain, return 'other'.",
    "Use only these condition values: new, like_new, good, fair, poor.",
    "Return suggestedStartingPriceCents as a positive integer in USD cents.",
  ].join(" ");
}

function buildSmartListingCreatorPrompt() {
  return [
    "Analyze only the attached listing image.",
    "Generate a title, description, category, condition, and suggestedStartingPriceCents for an auction draft.",
    "The title should be specific but not overly long.",
    "The description should be sarcastic, humerous and based only on visible evidence from the image.",
  ].join(" ");
}

const descriptionToneInstructions: Record<DescriptionEnhancerTone, string> = {
  concise:
    "Keep the voice tight, direct, and efficient while still sounding natural.",
  max_hype:
    "Lean energetic and sales-forward, but stay believable and grounded in the source text.",
  sarcastic:
    "Use dry, playful sarcasm without becoming mean or inventing facts.",
  friendly:
    "Sound warm, conversational, and helpful without overhyping the item.",
};

export function buildDescriptionEnhancerSystemPrompt(
  tone: DescriptionEnhancerTone,
) {
  return [
    "You improve seller-written auction descriptions.",
    "Write 50 to 200 words.",
    descriptionToneInstructions[tone],
    "Use only the provided listing title, category, condition, and source description.",
    "Do not invent features, accessories, specs, defects, provenance, measurements, included items, or condition details that are not already present in the source description.",
  ].join(" ");
}

export function buildDescriptionEnhancerPrompt(input: {
  title: string;
  category: string;
  condition: string;
  description: string;
  tone: DescriptionEnhancerTone;
}) {
  return [
    `Tone: ${input.tone}`,
    `Title: ${input.title}`,
    `Category: ${input.category}`,
    `Condition: ${input.condition}`,
    "Source description:",
    input.description,
    "Rewrite the source description using only those details.",
  ].join("\n");
}

async function generateStructuredObjectWithFallback<TSchema extends ZodType>(
  options: Omit<GenerateStructuredObjectOptions<TSchema>, "modelId"> & {
    adapter?: AiAdapter;
  },
) {
  const adapter = options.adapter ?? defaultAdapter;

  try {
    return await adapter.generateStructuredObject({
      ...options,
      modelId: primaryModelId,
    });
  } catch (primaryError) {
    try {
      return await adapter.generateStructuredObject({
        ...options,
        modelId: fallbackModelId,
      });
    } catch (fallbackError) {
      throw new AiGenerationError("Both AI models failed.", {
        cause: fallbackError ?? primaryError,
      });
    }
  }
}

export async function generateSmartListingFromImage(
  imageUrl: string,
  adapter?: AiAdapter,
) {
  return generateStructuredObjectWithFallback({
    adapter,
    schema: smartListingCreatorSchema,
    schemaName: "smart_listing_creator_result",
    system: buildSmartListingCreatorSystemPrompt(),
    prompt: buildSmartListingCreatorPrompt(),
    imageUrls: [imageUrl],
  });
}

export async function streamEnhancedDescription(
  input: {
    title: string;
    category: string;
    condition: string;
    description: string;
    tone: DescriptionEnhancerTone;
  },
  options?: {
    adapter?: AiAdapter;
    onTextDelta?: (delta: string) => Promise<void> | void;
  },
) {
  const adapter = options?.adapter ?? defaultAdapter;

  if (!adapter.streamText) {
    throw new AiGenerationError("Streaming AI generation is not available.");
  }

  const sharedOptions = {
    system: buildDescriptionEnhancerSystemPrompt(input.tone),
    prompt: buildDescriptionEnhancerPrompt(input),
  };
  let lastError: unknown;

  for (const modelId of [primaryModelId, fallbackModelId]) {
    let generatedText = "";
    let receivedText = false;

    try {
      for await (const delta of adapter.streamText({
        modelId,
        ...sharedOptions,
      })) {
        if (!delta) {
          continue;
        }

        receivedText = true;
        generatedText += delta;
        await options?.onTextDelta?.(delta);
      }

      return {
        text: generatedText,
        modelId,
      };
    } catch (error) {
      lastError = error;

      if (receivedText || modelId === fallbackModelId) {
        throw new AiGenerationError("AI description enhancement failed.", {
          cause: error,
        });
      }
    }
  }

  throw new AiGenerationError("Both AI models failed.", {
    cause: lastError,
  });
}
