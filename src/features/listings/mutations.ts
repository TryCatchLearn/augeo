import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { bid, listing, listingImage, user } from "@/db/schema";
import type {
  ListingDraftDefaults,
  ListingStatus,
} from "@/features/listings/domain";
import {
  canReceiveBids,
  getMinimumNextBidCents,
} from "@/features/listings/domain";
import type {
  PlaceBidInput,
  SaveDraftListingInput,
} from "@/features/listings/schema";

type Database = LibSQLDatabase<typeof schema>;
type BidStateDatabase = Pick<Database, "select">;

async function resolveDatabase(database?: Database) {
  if (database) {
    return database;
  }

  const { db } = await import("@/db/client");

  return db;
}

export async function insertDraftWithMainImage(
  input: {
    sellerId: string;
    uploadPublicId: string;
    uploadUrl: string;
    defaults: ListingDraftDefaults;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const listingId = randomUUID();
  const now = new Date();

  await resolvedDatabase.transaction(async (tx) => {
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

  return { id: listingId };
}

export async function updateDraftListing(
  input: SaveDraftListingInput,
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);

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

export async function updateListingStatus(
  input: { listingId: string; status: ListingStatus },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);

  await resolvedDatabase
    .update(listing)
    .set({
      status: input.status,
    })
    .where(eq(listing.id, input.listingId));

  return { id: input.listingId, status: input.status };
}

export async function deleteDraftListingRecords(
  listingId: string,
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);

  await resolvedDatabase.transaction(async (tx) => {
    await tx.delete(listingImage).where(eq(listingImage.listingId, listingId));
    await tx.delete(listing).where(eq(listing.id, listingId));
  });

  return { id: listingId };
}

export async function insertListingImage(
  input: {
    listingId: string;
    uploadPublicId: string;
    uploadUrl: string;
    isMain: boolean;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const imageId = randomUUID();

  await resolvedDatabase.insert(listingImage).values({
    id: imageId,
    listingId: input.listingId,
    publicId: input.uploadPublicId,
    url: input.uploadUrl,
    isMain: input.isMain,
  });

  return { id: imageId, listingId: input.listingId };
}

export async function setMainListingImage(
  input: {
    listingId: string;
    imageId: string;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);

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

export async function deleteListingImageRecord(
  input: {
    imageId: string;
    nextMainImageId: string | null;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);

  await resolvedDatabase.transaction(async (tx) => {
    await tx.delete(listingImage).where(eq(listingImage.id, input.imageId));

    if (input.nextMainImageId) {
      await tx
        .update(listingImage)
        .set({
          isMain: true,
        })
        .where(eq(listingImage.id, input.nextMainImageId));
    }
  });

  return { id: input.imageId };
}

export async function incrementListingDescriptionGenerationCount(
  input: {
    listingId: string;
    sellerId: string;
    currentCount: number;
  },
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const nextCount = input.currentCount + 1;

  await resolvedDatabase
    .update(listing)
    .set({
      aiDescriptionGenerationCount: nextCount,
    })
    .where(
      and(
        eq(listing.id, input.listingId),
        eq(listing.sellerId, input.sellerId),
        eq(listing.aiDescriptionGenerationCount, input.currentCount),
      ),
    );

  return { aiDescriptionGenerationCount: nextCount };
}

export class BidActionError extends Error {}
class BidConcurrencyConflictError extends Error {}

type PlaceBidTestControls = {
  afterBidStateRead?: () => Promise<void>;
};

type ListingBidState = {
  id: string;
  title: string;
  sellerId: string;
  status: ListingStatus;
  endsAt: Date;
  startingBidCents: number;
  currentBidCents: number | null;
  bidCount: number;
  version: number;
};

type HighestBidRecord = {
  id: string;
  bidderId: string;
  bidderName: string;
  amountCents: number;
  createdAt: Date;
};

async function getListingBidState(
  database: BidStateDatabase,
  listingId: string,
) {
  const [listingRecord] = await database
    .select({
      id: listing.id,
      title: listing.title,
      sellerId: listing.sellerId,
      status: listing.status,
      endsAt: listing.endsAt,
      startingBidCents: listing.startingBidCents,
      currentBidCents: listing.currentBidCents,
      bidCount: listing.bidCount,
      version: listing.version,
    })
    .from(listing)
    .where(eq(listing.id, listingId));

  if (!listingRecord) {
    return null;
  }

  const [highestBid] = await database
    .select({
      id: bid.id,
      bidderId: bid.bidderId,
      bidderName: user.name,
      amountCents: bid.amountCents,
      createdAt: bid.createdAt,
    })
    .from(bid)
    .innerJoin(user, eq(bid.bidderId, user.id))
    .where(eq(bid.listingId, listingId))
    .orderBy(desc(bid.amountCents), desc(bid.createdAt))
    .limit(1);

  return {
    listingRecord,
    highestBid: highestBid ?? null,
  };
}

function validateBidAttempt(
  input: {
    bidderId: string;
    amountCents: number;
    now: Date;
  },
  listingRecord: ListingBidState,
  highestBid: HighestBidRecord | null,
) {
  if (listingRecord.sellerId === input.bidderId) {
    throw new BidActionError("You can't bid on your own listing.");
  }

  if (!canReceiveBids(listingRecord.status, listingRecord.endsAt, input.now)) {
    if (listingRecord.status !== "active") {
      throw new BidActionError("Only active listings can accept bids.");
    }

    throw new BidActionError("This auction has already ended.");
  }

  const minimumNextBidCents = getMinimumNextBidCents(
    listingRecord.startingBidCents,
    highestBid?.amountCents ?? listingRecord.currentBidCents,
  );

  if (input.amountCents < minimumNextBidCents) {
    throw new BidActionError(
      `Bid must be at least ${minimumNextBidCents} cents.`,
    );
  }

  return {
    minimumNextBidCents,
  };
}

async function throwBidConflictError(
  input: {
    listingId: string;
    now: Date;
    expectedVersion: number | null;
  },
  database: Database,
) {
  let latestBidState = await getListingBidState(database, input.listingId);

  if (input.expectedVersion !== null) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (
        !latestBidState ||
        latestBidState.listingRecord.version !== input.expectedVersion
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
      latestBidState = await getListingBidState(database, input.listingId);
    }
  }

  if (!latestBidState) {
    throw new BidActionError("This listing is no longer available.");
  }

  if (
    !canReceiveBids(
      latestBidState.listingRecord.status,
      latestBidState.listingRecord.endsAt,
      input.now,
    )
  ) {
    if (latestBidState.listingRecord.status !== "active") {
      throw new BidActionError("Only active listings can accept bids.");
    }

    throw new BidActionError("This auction has already ended.");
  }

  throw new BidActionError(
    `Bid must be at least ${getMinimumNextBidCents(
      latestBidState.listingRecord.startingBidCents,
      latestBidState.highestBid?.amountCents ??
        latestBidState.listingRecord.currentBidCents,
    )} cents.`,
  );
}

function isBidConflictError(error: unknown) {
  if (error instanceof BidConcurrencyConflictError) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  if ("code" in error && error.code === "SQLITE_BUSY") {
    return true;
  }

  if ("cause" in error) {
    return isBidConflictError(error.cause);
  }

  return false;
}

export async function placeBidForListing(
  input: PlaceBidInput & {
    bidderId: string;
    now?: Date;
  },
  database?: Database,
  testControls?: PlaceBidTestControls,
) {
  const resolvedDatabase = await resolveDatabase(database);
  const now = input.now ?? new Date();
  const bidState = await getListingBidState(resolvedDatabase, input.listingId);

  if (!bidState) {
    throw new BidActionError("This listing is no longer available.");
  }

  const { listingRecord, highestBid } = bidState;
  const expectedVersion = listingRecord.version;

  validateBidAttempt(
    {
      bidderId: input.bidderId,
      amountCents: input.amountCents,
      now,
    },
    listingRecord,
    highestBid,
  );

  await testControls?.afterBidStateRead?.();

  try {
    return await resolvedDatabase.transaction(async (tx) => {
      const updatedListings = await tx
        .update(listing)
        .set({
          currentBidCents: input.amountCents,
          bidCount: sql`${listing.bidCount} + 1`,
          version: sql`${listing.version} + 1`,
        })
        .where(
          and(
            eq(listing.id, input.listingId),
            eq(listing.version, expectedVersion),
          ),
        )
        .returning({
          id: listing.id,
        });

      if (updatedListings.length === 0) {
        throw new BidConcurrencyConflictError();
      }

      const bidId = randomUUID();

      await tx.insert(bid).values({
        id: bidId,
        listingId: input.listingId,
        bidderId: input.bidderId,
        amountCents: input.amountCents,
        createdAt: now,
      });

      const [placedBid] = await tx
        .select({
          id: bid.id,
          listingId: bid.listingId,
          bidderId: bid.bidderId,
          bidderName: user.name,
          amountCents: bid.amountCents,
          createdAt: bid.createdAt,
        })
        .from(bid)
        .innerJoin(user, eq(bid.bidderId, user.id))
        .where(eq(bid.id, bidId));

      return {
        listingId: input.listingId,
        listingTitle: listingRecord.title,
        currentBidCents: input.amountCents,
        bidCount: listingRecord.bidCount + 1,
        minimumNextBidCents: getMinimumNextBidCents(
          listingRecord.startingBidCents,
          input.amountCents,
        ),
        highestBidderId: input.bidderId,
        previousHighestBidderId: highestBid?.bidderId ?? null,
        bid: placedBid,
      };
    });
  } catch (error) {
    if (isBidConflictError(error)) {
      await throwBidConflictError(
        {
          listingId: input.listingId,
          now,
          expectedVersion,
        },
        resolvedDatabase,
      );
    }

    throw error;
  }
}
