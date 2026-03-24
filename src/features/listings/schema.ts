import { z } from "zod";
import {
  type ListingCategory,
  type ListingCondition,
  listingCategories,
  listingConditions,
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
