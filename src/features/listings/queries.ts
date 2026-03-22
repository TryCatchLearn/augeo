import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { listing, listingImage, user } from "@/db/schema";
import type { ListingStatus } from "@/features/listings/domain";

export type ListingCardData = {
  id: string;
  title: string;
  status: ListingStatus;
  startingBidCents: number;
  bidCount: number;
  sellerName: string;
  endsAt: Date;
  imageUrl: string | null;
};

type Database = LibSQLDatabase<typeof schema>;

async function resolveDatabase(database?: Database) {
  if (database) {
    return database;
  }

  const { db } = await import("@/db/client");

  return db;
}

const listingCardSelection = {
  id: listing.id,
  title: listing.title,
  status: listing.status,
  startingBidCents: listing.startingBidCents,
  bidCount: sql<number>`0`,
  sellerName: user.name,
  endsAt: listing.endsAt,
  imageUrl: listingImage.url,
};

export async function listPublicListingCards(database?: Database) {
  const resolvedDatabase = await resolveDatabase(database);

  return resolvedDatabase
    .select(listingCardSelection)
    .from(listing)
    .innerJoin(user, eq(listing.sellerId, user.id))
    .leftJoin(
      listingImage,
      and(
        eq(listingImage.listingId, listing.id),
        eq(listingImage.isMain, true),
      ),
    )
    .where(ne(listing.status, "draft"))
    .orderBy(desc(listing.createdAt));
}

export async function listSellerListingCards(
  sellerId: string,
  status: ListingStatus,
  database?: Database,
) {
  const resolvedDatabase = await resolveDatabase(database);

  return resolvedDatabase
    .select(listingCardSelection)
    .from(listing)
    .innerJoin(user, eq(listing.sellerId, user.id))
    .leftJoin(
      listingImage,
      and(
        eq(listingImage.listingId, listing.id),
        eq(listingImage.isMain, true),
      ),
    )
    .where(and(eq(listing.sellerId, sellerId), eq(listing.status, status)))
    .orderBy(desc(listing.updatedAt));
}
