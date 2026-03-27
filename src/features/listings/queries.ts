import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { listing, listingImage, user } from "@/db/schema";
import {
  canViewListingDetail,
  type ListingStatus,
} from "@/features/listings/domain";

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

export type ListingDetailData = {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  description: string;
  location: string;
  category: string;
  condition: string;
  status: "draft" | "scheduled" | "active" | "ended";
  startingBidCents: number;
  reservePriceCents: number | null;
  aiDescriptionGenerationCount: number;
  startsAt: Date | null;
  endsAt: Date;
  images: Array<{
    id: string;
    url: string;
    isMain: boolean;
  }>;
};

export type OwnedListingRecord = {
  id: string;
  sellerId: string;
  status: ListingStatus;
  startsAt: Date | null;
  aiDescriptionGenerationCount: number;
};

export type ListingImageAssetRecord = {
  id: string;
  publicId: string;
  isMain: boolean;
};

type Database = LibSQLDatabase<typeof schema>;

export const publicListingStatuses = ["active", "scheduled", "ended"] as const;
export const listingPageSizes = [6, 12, 18, 24] as const;

export type PublicListingStatus = (typeof publicListingStatuses)[number];
export type ListingPageSize = (typeof listingPageSizes)[number];

export type PublicListingsQueryInput = {
  status?: string;
  page?: string;
  pageSize?: string;
};

export type PublicListingsQuery = {
  status: PublicListingStatus;
  page: number;
  pageSize: ListingPageSize;
};

export type PaginatedListingCardResult = {
  items: ListingCardData[];
  totalCount: number;
  page: number;
  pageSize: ListingPageSize;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

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

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export function normalizePublicListingsQuery(
  input?: PublicListingsQueryInput,
): PublicListingsQuery {
  const trimmedStatus = input?.status?.trim();
  const status = publicListingStatuses.includes(
    trimmedStatus as PublicListingStatus,
  )
    ? (trimmedStatus as PublicListingStatus)
    : "active";

  const page = normalizePositiveInteger(input?.page, 1);
  const requestedPageSize = normalizePositiveInteger(input?.pageSize, 6);
  const pageSize = listingPageSizes.includes(
    requestedPageSize as ListingPageSize,
  )
    ? (requestedPageSize as ListingPageSize)
    : 6;

  return {
    status,
    page,
    pageSize,
  };
}

export async function listPublicListingCards(
  input?: PublicListingsQueryInput,
  database?: Database,
): Promise<PaginatedListingCardResult> {
  const resolvedDatabase = await resolveDatabase(database);
  const query = normalizePublicListingsQuery(input);
  const whereClause = eq(listing.status, query.status);
  const [{ totalCount }] = await resolvedDatabase
    .select({
      totalCount: sql<number>`count(*)`,
    })
    .from(listing)
    .where(whereClause);

  const items = await resolvedDatabase
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
    .where(whereClause)
    .orderBy(desc(listing.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return {
    items,
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: totalCount === 0 ? 0 : Math.ceil(totalCount / query.pageSize),
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page * query.pageSize < totalCount,
  };
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

export async function getListingDetail(
  listingId: string,
  database?: Database,
): Promise<ListingDetailData | null> {
  const resolvedDatabase = await resolveDatabase(database);
  const results = await resolvedDatabase
    .select({
      id: listing.id,
      sellerId: listing.sellerId,
      sellerName: user.name,
      title: listing.title,
      description: listing.description,
      location: listing.location,
      category: listing.category,
      condition: listing.condition,
      status: listing.status,
      startingBidCents: listing.startingBidCents,
      reservePriceCents: listing.reservePriceCents,
      aiDescriptionGenerationCount: listing.aiDescriptionGenerationCount,
      startsAt: listing.startsAt,
      endsAt: listing.endsAt,
      imageId: listingImage.id,
      imageUrl: listingImage.url,
      imageIsMain: listingImage.isMain,
    })
    .from(listing)
    .innerJoin(user, eq(listing.sellerId, user.id))
    .leftJoin(listingImage, eq(listingImage.listingId, listing.id))
    .where(eq(listing.id, listingId))
    .orderBy(desc(listingImage.isMain), asc(listingImage.createdAt));

  const [firstResult] = results;

  if (!firstResult) {
    return null;
  }

  return {
    id: firstResult.id,
    sellerId: firstResult.sellerId,
    sellerName: firstResult.sellerName,
    title: firstResult.title,
    description: firstResult.description,
    location: firstResult.location,
    category: firstResult.category,
    condition: firstResult.condition,
    status: firstResult.status,
    startingBidCents: firstResult.startingBidCents,
    reservePriceCents: firstResult.reservePriceCents,
    aiDescriptionGenerationCount: firstResult.aiDescriptionGenerationCount,
    startsAt: firstResult.startsAt,
    endsAt: firstResult.endsAt,
    images: results.flatMap((result) => {
      if (!result.imageId || !result.imageUrl) {
        return [];
      }

      return [
        {
          id: result.imageId,
          url: result.imageUrl,
          isMain: Boolean(result.imageIsMain),
        },
      ];
    }),
  };
}

export async function getListingDetailForViewer(
  listingId: string,
  viewerId?: string | null,
  database?: Database,
) {
  const result = await getListingDetail(listingId, database);

  if (!result) {
    return null;
  }

  if (
    !canViewListingDetail({
      sellerId: result.sellerId,
      viewerId,
      status: result.status,
    })
  ) {
    return null;
  }

  return result;
}

export async function getOwnedListing(
  sellerId: string,
  listingId: string,
  database?: Database,
): Promise<OwnedListingRecord | null> {
  const resolvedDatabase = await resolveDatabase(database);
  const [record] = await resolvedDatabase
    .select({
      id: listing.id,
      sellerId: listing.sellerId,
      status: listing.status,
      startsAt: listing.startsAt,
      aiDescriptionGenerationCount: listing.aiDescriptionGenerationCount,
    })
    .from(listing)
    .where(and(eq(listing.id, listingId), eq(listing.sellerId, sellerId)));

  return record ?? null;
}

export async function listListingImageAssets(
  listingId: string,
  database?: Database,
): Promise<ListingImageAssetRecord[]> {
  const resolvedDatabase = await resolveDatabase(database);

  return resolvedDatabase
    .select({
      id: listingImage.id,
      publicId: listingImage.publicId,
      isMain: listingImage.isMain,
    })
    .from(listingImage)
    .where(eq(listingImage.listingId, listingId));
}
