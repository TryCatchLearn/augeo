import type { ListingCategory } from "@/features/listings/domain";
import { listingCategories } from "@/features/listings/domain";

export const publicListingStatuses = ["active", "scheduled", "ended"] as const;
export const listingPageSizes = [6, 12, 18, 24] as const;
export const publicListingPriceFilters = [
  "lt_10",
  "lt_50",
  "lt_100",
  "lt_500",
] as const;
export const publicListingSorts = [
  "newest",
  "ending_soonest",
  "price_asc",
  "price_desc",
] as const;

export type PublicListingStatus = (typeof publicListingStatuses)[number];
export type ListingPageSize = (typeof listingPageSizes)[number];
export type PublicListingPriceFilter =
  (typeof publicListingPriceFilters)[number];
export type PublicListingSort = (typeof publicListingSorts)[number];

export type PublicListingsQueryInput = {
  status?: string;
  q?: string;
  category?: string;
  price?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

export type PublicListingsQuery = {
  status: PublicListingStatus;
  q: string;
  category: ListingCategory | null;
  price: PublicListingPriceFilter | null;
  sort: PublicListingSort;
  page: number;
  pageSize: ListingPageSize;
};

export type DashboardListingsQueryInput = {
  status?: string;
  page?: string;
  pageSize?: string;
};

export type DashboardListingsQuery = {
  status: "draft" | "active" | "scheduled" | "ended";
  page: number;
  pageSize: ListingPageSize;
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
  const trimmedQuery = input?.q?.trim() ?? "";
  const trimmedCategory = input?.category?.trim();
  const trimmedPrice = input?.price?.trim();
  const trimmedSort = input?.sort?.trim();

  const status = publicListingStatuses.includes(
    trimmedStatus as PublicListingStatus,
  )
    ? (trimmedStatus as PublicListingStatus)
    : "active";
  const category = listingCategories.includes(
    trimmedCategory as ListingCategory,
  )
    ? (trimmedCategory as ListingCategory)
    : null;
  const price = publicListingPriceFilters.includes(
    trimmedPrice as PublicListingPriceFilter,
  )
    ? (trimmedPrice as PublicListingPriceFilter)
    : null;
  const sort = publicListingSorts.includes(trimmedSort as PublicListingSort)
    ? (trimmedSort as PublicListingSort)
    : "newest";
  const page = normalizePositiveInteger(input?.page, 1);
  const requestedPageSize = normalizePositiveInteger(input?.pageSize, 6);
  const pageSize = listingPageSizes.includes(
    requestedPageSize as ListingPageSize,
  )
    ? (requestedPageSize as ListingPageSize)
    : 6;

  return {
    status,
    q: trimmedQuery,
    category,
    price,
    sort,
    page,
    pageSize,
  };
}

export function normalizeDashboardListingsQuery(
  input?: DashboardListingsQueryInput,
): DashboardListingsQuery {
  const trimmedStatus = input?.status?.trim();
  const status =
    trimmedStatus === "draft" ||
    trimmedStatus === "active" ||
    trimmedStatus === "scheduled" ||
    trimmedStatus === "ended"
      ? trimmedStatus
      : "draft";
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
