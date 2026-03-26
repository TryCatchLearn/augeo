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
  canAddListingImage,
  canDeleteListing,
  canDeleteListingImage,
  canPublishListing,
  canReturnToDraft,
  getNextMainImageIdAfterDelete,
  getPublishedStatus,
} from "@/features/listings/domain";
import type { SaveDraftListingInput } from "@/features/listings/schema";
import {
  normalizeSmartListingCategory,
  normalizeSuggestedStartingPriceCents,
  validateSmartListingCondition,
} from "@/features/listings/schema";
import { AiGenerationError, generateSmartListingFromImage } from "@/server/ai";
import { deleteCloudinaryAssets } from "@/server/cloudinary";

type Database = LibSQLDatabase<typeof schema>;

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
  creationMode: "ai" | "manual";
};

export type CreateDraftFromFirstUploadResult =
  | { id: string; status: "created" }
  | { status: "ai_failed"; message: string };

const manualDraftLocation = "Add location";
const manualDraftTitle = "Untitled draft";
const manualDraftDescription =
  "Add a seller-written description before publishing.";
const smartListingFailureMessage =
  "We couldn't create an AI draft right now. Retry AI or continue without AI.";

async function resolveDatabase(database?: Database) {
  if (database) {
    return database;
  }

  const { db } = await import("@/db/client");

  return db;
}

export function buildManualDraftDefaults(
  now = new Date(),
): ListingDraftDefaults {
  return {
    title: manualDraftTitle,
    description: manualDraftDescription,
    location: manualDraftLocation,
    category: "other",
    condition: "good",
    startingBidCents: 100,
    reservePriceCents: null,
    startsAt: null,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "draft",
  };
}

export function buildSmartListingDraftDefaults(
  input: {
    title: string;
    description: string;
    category: string;
    condition: string;
    suggestedStartingPriceCents: number;
  },
  now = new Date(),
): ListingDraftDefaults {
  const condition = validateSmartListingCondition(input.condition);
  const startingBidCents = normalizeSuggestedStartingPriceCents(
    input.suggestedStartingPriceCents,
  );

  if (!condition || !startingBidCents) {
    throw new AiGenerationError("Invalid smart listing result.");
  }

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    location: manualDraftLocation,
    category: normalizeSmartListingCategory(input.category),
    condition,
    startingBidCents,
    reservePriceCents: null,
    startsAt: null,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: "draft",
  };
}

async function insertDraftWithMainImage(
  input: {
    sellerId: string;
    uploadPublicId: string;
    uploadUrl: string;
    defaults: ListingDraftDefaults;
  },
  database: Database,
  now: Date,
) {
  const listingId = randomUUID();

  await database.transaction(async (tx) => {
    await tx.insert(listing).values({
      id: listingId,
      sellerId: input.sellerId,
      aiDescriptionGenerationCount: 0,
      ...input.defaults,
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

  return { id: listingId, status: "created" as const };
}

export async function createDraftFromFirstUpload(
  input: CreateDraftFromUploadInput,
  database?: Database,
  dependencies?: {
    generateSmartListingFromImage?: typeof generateSmartListingFromImage;
  },
) {
  const resolvedDatabase = await resolveDatabase(database);
  const now = new Date();
  const insertDraft = (defaults: ListingDraftDefaults) =>
    insertDraftWithMainImage(
      {
        sellerId: input.sellerId,
        uploadPublicId: input.uploadPublicId,
        uploadUrl: input.uploadUrl,
        defaults,
      },
      resolvedDatabase,
      now,
    );

  if (input.creationMode === "manual") {
    return insertDraft(buildManualDraftDefaults(now));
  }

  try {
    const smartListing = await (
      dependencies?.generateSmartListingFromImage ??
      generateSmartListingFromImage
    )(input.uploadUrl);

    return insertDraft(buildSmartListingDraftDefaults(smartListing, now));
  } catch (error) {
    if (error instanceof AiGenerationError) {
      return {
        status: "ai_failed" as const,
        message: smartListingFailureMessage,
      };
    }

    throw error;
  }
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

export async function addListingImage(
  input: {
    listingId: string;
    sellerId: string;
    uploadPublicId: string;
    uploadUrl: string;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const existingListing = await getOwnedListing(
    input.sellerId,
    input.listingId,
    resolvedDatabase,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing image cannot be added.");
  }

  const images = await resolvedDatabase
    .select({
      id: listingImage.id,
    })
    .from(listingImage)
    .where(eq(listingImage.listingId, input.listingId));

  if (!canAddListingImage(images.length)) {
    throw new Error("Listings can include up to 5 images.");
  }

  const imageId = randomUUID();

  await resolvedDatabase.insert(listingImage).values({
    id: imageId,
    listingId: input.listingId,
    publicId: input.uploadPublicId,
    url: input.uploadUrl,
    isMain: images.length === 0,
  });

  return { id: imageId, listingId: input.listingId };
}

export async function setMainListingImage(
  input: {
    listingId: string;
    imageId: string;
    sellerId: string;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const existingListing = await getOwnedListing(
    input.sellerId,
    input.listingId,
    resolvedDatabase,
  );

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing main image cannot be updated.");
  }

  const [targetImage] = await resolvedDatabase
    .select({
      id: listingImage.id,
    })
    .from(listingImage)
    .where(
      and(
        eq(listingImage.id, input.imageId),
        eq(listingImage.listingId, input.listingId),
      ),
    );

  if (!targetImage) {
    throw new Error("Listing image was not found.");
  }

  await resolvedDatabase.transaction(async (tx) => {
    await tx
      .update(listingImage)
      .set({
        isMain: false,
      })
      .where(eq(listingImage.listingId, input.listingId));

    await tx
      .update(listingImage)
      .set({
        isMain: true,
      })
      .where(eq(listingImage.id, input.imageId));
  });

  return { id: input.imageId, listingId: input.listingId };
}

export async function deleteListingImage(
  input: {
    listingId: string;
    imageId: string;
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

  if (!existingListing || existingListing.status !== "draft") {
    throw new Error("Listing image cannot be deleted.");
  }

  const images = await resolvedDatabase
    .select({
      id: listingImage.id,
      publicId: listingImage.publicId,
      isMain: listingImage.isMain,
    })
    .from(listingImage)
    .where(eq(listingImage.listingId, input.listingId));

  const targetImage = images.find((image) => image.id === input.imageId);

  if (!targetImage) {
    throw new Error("Listing image was not found.");
  }

  if (!canDeleteListingImage(images.length)) {
    throw new Error("The final listing image cannot be deleted.");
  }

  const nextMainImageId = getNextMainImageIdAfterDelete(images, input.imageId);

  await (input.deleteAssets ?? deleteCloudinaryAssets)([targetImage.publicId]);

  await resolvedDatabase.transaction(async (tx) => {
    await tx.delete(listingImage).where(eq(listingImage.id, input.imageId));

    if (targetImage.isMain && nextMainImageId) {
      await tx
        .update(listingImage)
        .set({
          isMain: true,
        })
        .where(eq(listingImage.id, nextMainImageId));
    }
  });

  return { id: input.imageId, listingId: input.listingId };
}
