import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { listing, listingImage } from "@/db/schema";
import type {
  ListingCategory,
  ListingCondition,
} from "@/features/listings/domain";
import {
  canDeleteListing,
  canPublishListing,
  canReturnToDraft,
  getPublishedStatus,
} from "@/features/listings/domain";
import type { SaveDraftListingInput } from "@/features/listings/schema";
import { deleteCloudinaryAssets } from "@/server/cloudinary";

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

async function getOwnedListing(
  sellerId: string,
  listingId: string,
  database: Database,
) {
  const [record] = await database
    .select()
    .from(listing)
    .where(and(eq(listing.id, listingId), eq(listing.sellerId, sellerId)));

  return record ?? null;
}

export async function saveDraftListing(
  input: SaveDraftListingInput & { sellerId: string },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const existingListing = await getOwnedListing(
    input.sellerId,
    input.listingId,
    resolvedDatabase,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing cannot be edited.");
  }

  await resolvedDatabase
    .update(listing)
    .set({
      title: input.title,
      description: input.description,
      location: input.location,
      category: input.category,
      condition: input.condition,
      startingBidCents: input.startingBidCents,
      reservePriceCents: input.reservePriceCents,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: new Date(input.endsAt),
    })
    .where(eq(listing.id, input.listingId));

  return { id: input.listingId };
}

export async function publishListing(
  input: { listingId: string; sellerId: string; now?: Date },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const existingListing = await getOwnedListing(
    input.sellerId,
    input.listingId,
    resolvedDatabase,
  );

  if (!existingListing || !canPublishListing(existingListing.status)) {
    throw new Error("Listing cannot be published.");
  }

  const nextStatus = getPublishedStatus(
    existingListing.startsAt,
    input.now ?? new Date(),
  );

  await resolvedDatabase
    .update(listing)
    .set({
      status: nextStatus,
    })
    .where(eq(listing.id, input.listingId));

  return { id: input.listingId, status: nextStatus };
}

export async function returnListingToDraft(
  input: { listingId: string; sellerId: string },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const existingListing = await getOwnedListing(
    input.sellerId,
    input.listingId,
    resolvedDatabase,
  );

  if (!existingListing || !canReturnToDraft(existingListing.status, 0)) {
    throw new Error("Listing cannot be returned to draft.");
  }

  await resolvedDatabase
    .update(listing)
    .set({
      status: "draft",
    })
    .where(eq(listing.id, input.listingId));

  return { id: input.listingId, status: "draft" as const };
}

export async function deleteDraftListing(
  input: {
    listingId: string;
    sellerId: string;
    deleteAssets?: (publicIds: string[]) => Promise<void>;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const existingListing = await getOwnedListing(
    input.sellerId,
    input.listingId,
    resolvedDatabase,
  );

  if (!existingListing || !canDeleteListing(existingListing.status)) {
    throw new Error("Listing cannot be deleted.");
  }

  const images = await resolvedDatabase
    .select({
      id: listingImage.id,
      publicId: listingImage.publicId,
    })
    .from(listingImage)
    .where(eq(listingImage.listingId, input.listingId));

  await (input.deleteAssets ?? deleteCloudinaryAssets)(
    images.map((image) => image.publicId),
  );

  await resolvedDatabase.transaction(async (tx) => {
    await tx
      .delete(listingImage)
      .where(eq(listingImage.listingId, input.listingId));
    await tx.delete(listing).where(eq(listing.id, input.listingId));
  });

  return { id: input.listingId };
}
