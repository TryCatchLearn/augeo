import { randomUUID } from "node:crypto";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { listing, listingImage } from "@/db/schema";
import type {
  ListingCategory,
  ListingCondition,
} from "@/features/listings/domain";

type Database = LibSQLDatabase<typeof schema>;

const placeholderTitles = [
  "Vintage Find Awaiting Its Spotlight",
  "Collector Piece Ready For Auction",
  "Fresh Listing Prepared For Launch",
  "Curated Lot With Room To Shine",
  "Standout Item Tuned For Bidding",
] as const;

const placeholderDescriptions = [
  "A clean starter draft generated from the first uploaded photo. Review the details, fine-tune the description, and publish when everything looks right.",
  "This placeholder description keeps the draft publish-ready while you refine the exact story, specs, and condition notes for buyers.",
  "Your image has already been saved, and this generated draft gives you a complete starting point for the auction flow.",
  "A deterministic draft description is in place so the listing can be opened immediately and refined without rebuilding any state.",
  "This draft uses safe placeholder copy based on the upload seed, making it easy to continue editing from a stable default.",
] as const;

const placeholderLocations = [
  "Seattle, WA",
  "Austin, TX",
  "Brooklyn, NY",
  "Denver, CO",
  "Portland, OR",
] as const;

const placeholderCategories: readonly ListingCategory[] = [
  "electronics",
  "fashion",
  "collectibles",
  "home_garden",
  "media",
] as const;

const placeholderConditions: readonly ListingCondition[] = [
  "like_new",
  "good",
  "fair",
  "new",
  "poor",
] as const;

export type ListingDraftDefaults = {
  title: string;
  description: string;
  location: string;
  category: ListingCategory;
  condition: ListingCondition;
  startingBidCents: number;
  reservePriceCents: null;
  startsAt: null;
  endsAt: Date;
  status: "draft";
};

export type CreateDraftFromUploadInput = {
  sellerId: string;
  uploadPublicId: string;
  uploadUrl: string;
  seed: string;
};

async function resolveDatabase(database?: Database) {
  if (database) {
    return database;
  }

  const { db } = await import("@/db/client");

  return db;
}

function hashSeed(seed: string) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 2147483647;
  }

  return Math.abs(hash);
}

export function buildFakeDraftDefaults(
  seed: string,
  now = new Date(),
): ListingDraftDefaults {
  const hash = hashSeed(seed);

  return {
    title: placeholderTitles[hash % placeholderTitles.length],
    description: placeholderDescriptions[hash % placeholderDescriptions.length],
    location: placeholderLocations[hash % placeholderLocations.length],
    category: placeholderCategories[hash % placeholderCategories.length],
    condition: placeholderConditions[hash % placeholderConditions.length],
    startingBidCents: 2500 + (hash % 36) * 500,
    reservePriceCents: null,
    startsAt: null,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "draft",
  };
}

export async function createDraftFromFirstUpload(
  input: CreateDraftFromUploadInput,
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const now = new Date();
  const defaults = buildFakeDraftDefaults(input.seed, now);
  const listingId = randomUUID();

  await resolvedDatabase.transaction(async (tx) => {
    await tx.insert(listing).values({
      id: listingId,
      sellerId: input.sellerId,
      ...defaults,
    });

    await tx.insert(listingImage).values({
      id: randomUUID(),
      listingId,
      publicId: input.uploadPublicId,
      url: input.uploadUrl,
      isMain: true,
      createdAt: now,
    });
  });

  return { id: listingId };
}
