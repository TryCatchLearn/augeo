import type { PaginatedResult } from "@/features/listings/helpers/pagination";
import type { ListingCardData } from "@/features/listings/queries";

export function createPaginatedResult<T>(
  items: T[],
  overrides: Partial<PaginatedResult<T>> = {},
): PaginatedResult<T> {
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 6,
    ...overrides,
  };
}

export function createListingCardData(
  overrides: Partial<ListingCardData> = {},
): ListingCardData {
  return {
    id: "listing-1",
    title: "Public Camera",
    status: "active",
    startingBidCents: 25_000,
    currentPriceCents: 25_000,
    bidCount: 0,
    sellerName: "Seller One",
    endsAt: new Date("2026-03-21T18:00:00.000Z"),
    imageUrl: "https://picsum.photos/seed/public-camera/1200/900",
    ...overrides,
  };
}
