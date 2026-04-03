import { and, asc, desc, eq, like, lt, or, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "@/db/schema";
import { bid, listing, listingImage, user } from "@/db/schema";
import {
  canPlaceBid,
  canViewListingDetail,
  getCurrentPriceCents,
  getMinimumNextBidCents,
  getViewerBidStatus,
  type ListingStatus,
  type ViewerBidStatus,
} from "@/features/listings/domain";
import { getPublicListingPriceThresholdCents } from "@/features/listings/helpers/browse-options";
import {
  type DashboardListingsQueryInput,
  normalizeDashboardListingsQuery,
  normalizePublicListingsQuery,
  type PublicListingSort,
  type PublicListingsQueryInput,
} from "@/features/listings/helpers/browse-query";
import type { PaginatedResult } from "@/features/listings/helpers/pagination";

export type ListingCardData = {
  id: string;
  sellerId: string;
  title: string;
  status: ListingStatus;
  outcome: "sold" | "unsold" | "reserve_not_met" | null;
  startingBidCents: number;
  currentPriceCents: number;
  bidCount: number;
  sellerName: string;
  endsAt: Date;
  imageUrl: string | null;
};

export type BidHistoryRow = {
  id: string;
  bidderId: string;
  bidderName: string;
  amountCents: number;
  createdAt: Date;
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
  currentBidCents: number | null;
  currentPriceCents: number;
  minimumNextBidCents: number;
  bidCount: number;
  highestBidderId: string | null;
  viewerBidStatus: ViewerBidStatus;
  canPlaceBid: boolean;
  reservePriceCents: number | null;
  outcome: "sold" | "unsold" | "reserve_not_met" | null;
  winnerUserId: string | null;
  winningBidId: string | null;
  aiDescriptionGenerationCount: number;
  startsAt: Date | null;
  endsAt: Date;
  bidHistory: BidHistoryRow[];
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
  bidCount: number;
  aiDescriptionGenerationCount: number;
};

export type ListingImageAssetRecord = {
  id: string;
  publicId: string;
  isMain: boolean;
};

type Database = LibSQLDatabase<typeof schema>;
type WhereClause = NonNullable<ReturnType<typeof and>>;

async function resolveDatabase(database?: Database) {
  if (database) {
    return database;
  }

  const { db } = await import("@/db/client");

  return db;
}

const listingCardSelection = {
  id: listing.id,
  sellerId: listing.sellerId,
  title: listing.title,
  status: listing.status,
  outcome: listing.outcome,
  startingBidCents: listing.startingBidCents,
  currentPriceCents: sql<number>`coalesce(${listing.currentBidCents}, ${listing.startingBidCents})`,
  bidCount: listing.bidCount,
  sellerName: user.name,
  endsAt: listing.endsAt,
  imageUrl: listingImage.url,
};

function getPublicListingOrderBy(sort: PublicListingSort) {
  switch (sort) {
    case "ending_soonest":
      return [asc(listing.endsAt), desc(listing.createdAt)] as const;
    case "price_asc":
      return [
        asc(
          sql`coalesce(${listing.currentBidCents}, ${listing.startingBidCents})`,
        ),
        desc(listing.createdAt),
      ] as const;
    case "price_desc":
      return [
        desc(
          sql`coalesce(${listing.currentBidCents}, ${listing.startingBidCents})`,
        ),
        desc(listing.createdAt),
      ] as const;
    case "newest":
      return [desc(listing.createdAt)] as const;
  }
}

function buildPublicListingWhereClause(
  query: ReturnType<typeof normalizePublicListingsQuery>,
) {
  const conditions = [eq(listing.status, query.status)];

  if (query.q.length > 0) {
    const searchValue = `%${query.q.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${listing.title})`, searchValue),
        like(sql`lower(${listing.description})`, searchValue),
      ) ?? like(sql`lower(${listing.title})`, searchValue),
    );
  }

  if (query.category) {
    conditions.push(eq(listing.category, query.category));
  }

  if (query.price) {
    conditions.push(
      lt(
        sql`coalesce(${listing.currentBidCents}, ${listing.startingBidCents})`,
        getPublicListingPriceThresholdCents(query.price),
      ),
    );
  }

  return and(...conditions) ?? eq(listing.status, query.status);
}

async function countListings(database: Database, whereClause: WhereClause) {
  const [{ totalCount }] = await database
    .select({
      totalCount: sql<number>`count(*)`,
    })
    .from(listing)
    .where(whereClause);

  return totalCount;
}

function selectListingCards(database: Database) {
  return database
    .select(listingCardSelection)
    .from(listing)
    .innerJoin(user, eq(listing.sellerId, user.id))
    .leftJoin(
      listingImage,
      and(
        eq(listingImage.listingId, listing.id),
        eq(listingImage.isMain, true),
      ),
    );
}

export async function listPublicListingCards(
  input?: PublicListingsQueryInput,
  database?: Database,
): Promise<PaginatedResult<ListingCardData>> {
  const resolvedDatabase = await resolveDatabase(database);
  const query = normalizePublicListingsQuery(input);
  const whereClause = buildPublicListingWhereClause(query);
  const totalCount = await countListings(resolvedDatabase, whereClause);
  const items = await selectListingCards(resolvedDatabase)
    .where(whereClause)
    .orderBy(...getPublicListingOrderBy(query.sort))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return {
    items,
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function listSellerListingCards(
  sellerId: string,
  input?: DashboardListingsQueryInput,
  database?: Database,
): Promise<PaginatedResult<ListingCardData>> {
  const resolvedDatabase = await resolveDatabase(database);
  const query = normalizeDashboardListingsQuery(input);
  const whereClause =
    and(eq(listing.sellerId, sellerId), eq(listing.status, query.status)) ??
    eq(listing.sellerId, sellerId);
  const totalCount = await countListings(resolvedDatabase, whereClause);
  const items = await selectListingCards(resolvedDatabase)
    .where(whereClause)
    .orderBy(desc(listing.updatedAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  return {
    items,
    totalCount,
    page: query.page,
    pageSize: query.pageSize,
  };
}

async function getListingDetail(
  listingId: string,
  viewerId?: string | null,
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
      currentBidCents: listing.currentBidCents,
      bidCount: listing.bidCount,
      reservePriceCents: listing.reservePriceCents,
      outcome: listing.outcome,
      winnerUserId: listing.winnerUserId,
      winningBidId: listing.winningBidId,
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

  const {
    imageId: _imageId,
    imageUrl: _imageUrl,
    imageIsMain: _imageIsMain,
    ...listingDetail
  } = firstResult;

  const bidHistory = await resolvedDatabase
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
    .orderBy(desc(bid.createdAt));

  const [highestBid] = await resolvedDatabase
    .select({
      bidderId: bid.bidderId,
      amountCents: bid.amountCents,
    })
    .from(bid)
    .where(eq(bid.listingId, listingId))
    .orderBy(desc(bid.amountCents), desc(bid.createdAt))
    .limit(1);

  const currentBidCents =
    highestBid?.amountCents ?? listingDetail.currentBidCents ?? null;
  const currentPriceCents = getCurrentPriceCents(
    listingDetail.startingBidCents,
    currentBidCents,
  );
  const minimumNextBidCents = getMinimumNextBidCents(
    listingDetail.startingBidCents,
    currentBidCents,
  );
  const highestBidderId = highestBid?.bidderId ?? null;

  return {
    ...listingDetail,
    currentBidCents,
    currentPriceCents,
    minimumNextBidCents,
    highestBidderId,
    viewerBidStatus: getViewerBidStatus({
      viewerId,
      highestBidderId,
      hasViewerBid: Boolean(
        viewerId && bidHistory.some((row) => row.bidderId === viewerId),
      ),
    }),
    canPlaceBid: canPlaceBid({
      sellerId: listingDetail.sellerId,
      viewerId,
      status: listingDetail.status,
      endsAt: listingDetail.endsAt,
    }),
    bidHistory,
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
  const result = await getListingDetail(listingId, viewerId, database);

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
      bidCount: listing.bidCount,
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
