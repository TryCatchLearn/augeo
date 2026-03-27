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
  "most_bids",
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

const listingCategoryLabels: Record<ListingCategory, string> = {
  electronics: "Electronics",
  fashion: "Fashion",
  home_garden: "Home & Garden",
  collectibles: "Collectibles",
  art: "Art",
  jewelry_watches: "Jewelry & Watches",
  toys_hobbies: "Toys & Hobbies",
  sports_outdoors: "Sports & Outdoors",
  vehicles: "Vehicles",
  media: "Media",
  other: "Other",
};

const publicListingPriceThresholds: Record<PublicListingPriceFilter, number> = {
  lt_10: 1_000,
  lt_50: 5_000,
  lt_100: 10_000,
  lt_500: 50_000,
};

export const publicListingCategoryOptions = [
  { value: "all", label: "All Categories" },
  ...listingCategories.map((category) => ({
    value: category,
    label: listingCategoryLabels[category],
  })),
] as const;

export const publicListingPriceOptions = [
  { value: "any", label: "Any Price" },
  { value: "lt_10", label: "< $10" },
  { value: "lt_50", label: "< $50" },
  { value: "lt_100", label: "< $100" },
  { value: "lt_500", label: "< $500" },
] as const;

export const publicListingSortOptions = [
  { value: "newest", label: "Newest" },
  { value: "ending_soonest", label: "Ending Soonest" },
  { value: "most_bids", label: "Most Bids" },
  { value: "price_asc", label: "Price Low→High" },
  { value: "price_desc", label: "Price High→Low" },
] as const;

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export function getListingCategoryLabel(category: ListingCategory) {
  return listingCategoryLabels[category];
}

export function getPublicListingPriceThresholdCents(
  priceFilter: PublicListingPriceFilter,
) {
  return publicListingPriceThresholds[priceFilter];
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
