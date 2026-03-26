import { createGateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import type { ZodType } from "zod";
import { smartListingCreatorSchema } from "@/features/listings/schema";
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
}

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
