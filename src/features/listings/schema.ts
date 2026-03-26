import { z } from "zod";
import {
  type ListingCategory,
  type ListingCondition,
  listingCategories,
  listingConditions,
  maxListingImageCount,
} from "@/features/listings/domain";

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function isValidLocalDateTime(value: string) {
  if (!localDateTimePattern.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function parsePositiveMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }

  return Number(value.toFixed(2));
}

const localDateTimeField = z
  .string()
  .trim()
  .min(1, "Choose a date and time.")
  .refine(isValidLocalDateTime, "Enter a valid date and time.");

const moneyField = z.preprocess(
  parsePositiveMoney,
  z
    .number({
      error: "Enter a valid dollar amount.",
    })
    .positive("Amount must be greater than zero."),
);

export const listingDraftFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim().min(1, "Description is required."),
    location: z.string().trim().min(1, "Location is required."),
    category: z.enum(listingCategories, {
      error: "Choose a category.",
    }),
    condition: z.enum(listingConditions, {
      error: "Choose a condition.",
    }),
    startingBidDollars: moneyField,
    reservePriceDollars: z.preprocess(
      (value) => {
        if (value === "" || value === null || value === undefined) {
          return undefined;
        }

        return parsePositiveMoney(value);
      },
      z
        .number({
          error: "Enter a valid reserve price.",
        })
        .positive("Reserve price must be greater than zero.")
        .optional(),
    ),
    startsAt: z
      .string()
      .trim()
      .refine((value) => value === "" || isValidLocalDateTime(value), {
        message: "Enter a valid date and time.",
      }),
    endsAt: localDateTimeField,
  })
  .superRefine((values, context) => {
    if (
      values.reservePriceDollars !== undefined &&
      values.reservePriceDollars < values.startingBidDollars
    ) {
      context.addIssue({
        code: "custom",
        message: "Reserve price must be at least the starting bid.",
        path: ["reservePriceDollars"],
      });
    }

    if (
      values.startsAt &&
      new Date(values.startsAt) >= new Date(values.endsAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "End time must be after the start time.",
        path: ["endsAt"],
      });
    }
  });

export type ListingDraftFormValues = z.infer<typeof listingDraftFormSchema>;
export type ListingDraftFormInput = z.input<typeof listingDraftFormSchema>;

export const descriptionEnhancerTones = [
  "concise",
  "max_hype",
  "sarcastic",
  "friendly",
] as const;

export type DescriptionEnhancerTone = (typeof descriptionEnhancerTones)[number];

export const descriptionEnhancerToneSchema = z.enum(descriptionEnhancerTones);

export const descriptionEnhancerToneLabels: Record<
  DescriptionEnhancerTone,
  string
> = {
  concise: "Concise",
  max_hype: "Max-hype",
  sarcastic: "Sarcastic",
  friendly: "Friendly",
};

export const maxDescriptionEnhancementRuns = 10;

export function getRemainingDescriptionEnhancementRuns(
  aiDescriptionGenerationCount: number,
) {
  return Math.max(
    0,
    maxDescriptionEnhancementRuns - aiDescriptionGenerationCount,
  );
}

export function hasDescriptionEnhancementRunsRemaining(
  aiDescriptionGenerationCount: number,
) {
  return (
    getRemainingDescriptionEnhancementRuns(aiDescriptionGenerationCount) > 0
  );
}

export const descriptionEnhancerRequestSchema = z.object({
  listingId: z.string().min(1),
  title: z.string().trim().min(1, "Title is required."),
  category: z.custom<ListingCategory>((value) =>
    listingCategories.includes(value as ListingCategory),
  ),
  condition: z.custom<ListingCondition>((value) =>
    listingConditions.includes(value as ListingCondition),
  ),
  description: z
    .string()
    .trim()
    .min(1, "Add a base description before using AI."),
  tone: descriptionEnhancerToneSchema,
});

export type DescriptionEnhancerRequest = z.infer<
  typeof descriptionEnhancerRequestSchema
>;

export const smartListingCreatorSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  condition: z.string().trim().min(1),
  suggestedStartingPriceCents: z.number().int().positive(),
});

export type SmartListingCreatorResult = z.infer<
  typeof smartListingCreatorSchema
>;

const numericTokenPattern =
  /\b\d+(?:[.,]\d+)?(?:["']|x|gb|tb|mb|mah|mm|cm|in|inch|inches|ft|fps|hz|v|w|mp)?\b/gi;

function getNormalizedNumericTokens(value: string) {
  return new Set(
    Array.from(value.toLowerCase().matchAll(numericTokenPattern), (match) =>
      match[0].replaceAll(",", ""),
    ),
  );
}

export function validateEnhancedDescriptionWordCount(value: string) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return wordCount >= 50 && wordCount <= 200;
}

export function validateEnhancedDescriptionSourceCompliance(
  value: string,
  sourceDescription: string,
) {
  const sourceTokens = getNormalizedNumericTokens(sourceDescription);
  const generatedTokens = getNormalizedNumericTokens(value);

  for (const token of generatedTokens) {
    if (!sourceTokens.has(token)) {
      return false;
    }
  }

  return true;
}

export function validateEnhancedDescription(
  value: string,
  sourceDescription: string,
) {
  const normalizedValue = value.trim();

  if (!validateEnhancedDescriptionWordCount(normalizedValue)) {
    return {
      success: false as const,
      message: "AI descriptions must be between 50 and 200 words.",
    };
  }

  if (
    !validateEnhancedDescriptionSourceCompliance(
      normalizedValue,
      sourceDescription,
    )
  ) {
    return {
      success: false as const,
      message:
        "AI description included details that were not supported by the source description.",
    };
  }

  return {
    success: true as const,
    description: normalizedValue,
  };
}

const isoDateTimeField = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid datetime.");

export const saveDraftListingSchema = z.object({
  listingId: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  location: z.string().trim().min(1),
  category: z.custom<ListingCategory>((value) =>
    listingCategories.includes(value as ListingCategory),
  ),
  condition: z.custom<ListingCondition>((value) =>
    listingConditions.includes(value as ListingCondition),
  ),
  startingBidCents: z.number().int().positive(),
  reservePriceCents: z.number().int().positive().nullable(),
  startsAt: isoDateTimeField.nullable(),
  endsAt: isoDateTimeField,
});

export type SaveDraftListingInput = z.infer<typeof saveDraftListingSchema>;

export const listingIdActionSchema = z.object({
  listingId: z.string().min(1),
});

export const listingImageActionSchema = z.object({
  listingId: z.string().min(1),
  imageId: z.string().min(1),
});

export const addListingImageSchema = z.object({
  listingId: z.string().min(1),
  uploadPublicId: z.string().min(1),
  uploadUrl: z.url(),
});

const listingCategoryAliases: Record<string, ListingCategory> = {
  art: "art",
  collectible: "collectibles",
  collectibles: "collectibles",
  electronics: "electronics",
  electronic: "electronics",
  fashion: "fashion",
  clothing: "fashion",
  home: "home_garden",
  home_garden: "home_garden",
  home_and_garden: "home_garden",
  "home & garden": "home_garden",
  "home and garden": "home_garden",
  jewelry: "jewelry_watches",
  jewelry_watches: "jewelry_watches",
  watches: "jewelry_watches",
  media: "media",
  movies: "media",
  music: "media",
  other: "other",
  sports: "sports_outdoors",
  outdoors: "sports_outdoors",
  sports_outdoors: "sports_outdoors",
  toys: "toys_hobbies",
  hobbies: "toys_hobbies",
  toys_hobbies: "toys_hobbies",
  vehicle: "vehicles",
  vehicles: "vehicles",
  automotive: "vehicles",
  auto: "vehicles",
};

const listingConditionAliases: Record<string, ListingCondition> = {
  new: "new",
  brand_new: "new",
  "brand new": "new",
  like_new: "like_new",
  "like new": "like_new",
  excellent: "like_new",
  good: "good",
  fair: "fair",
  poor: "poor",
  used_good: "good",
  used_fair: "fair",
};

function normalizeEnumInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll("/", " ")
    .replaceAll("-", "_")
    .replace(/\s+/g, "_");
}

export function normalizeSmartListingCategory(value: string): ListingCategory {
  const normalizedValue = normalizeEnumInput(value);

  return (
    listingCategoryAliases[normalizedValue] ??
    (listingCategories.includes(normalizedValue as ListingCategory)
      ? (normalizedValue as ListingCategory)
      : "other")
  );
}

export function validateSmartListingCondition(
  value: string,
): ListingCondition | null {
  const normalizedValue = normalizeEnumInput(value);

  return (
    listingConditionAliases[normalizedValue] ??
    (listingConditions.includes(normalizedValue as ListingCondition)
      ? (normalizedValue as ListingCondition)
      : null)
  );
}

export function normalizeSuggestedStartingPriceCents(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const cents = Math.round(value);

  return cents > 0 ? cents : null;
}

export function validateListingImageCount(imageCount: number) {
  if (imageCount >= maxListingImageCount) {
    throw new Error(
      `Listings can include up to ${maxListingImageCount} images.`,
    );
  }
}

export function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

export function localDateTimeToIsoString(value: string) {
  return new Date(value).toISOString();
}

export function formatDateTimeLocalInput(value: Date | null) {
  if (!value) {
    return "";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
