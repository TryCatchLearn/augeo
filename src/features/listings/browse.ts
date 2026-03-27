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

export type PaginationWindow = {
  pageCount: number;
  pageNumbers: number[];
};

export type ResultCountRange = {
  start: number;
  end: number;
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

export function createPublicListingsSearchParams(query: PublicListingsQuery) {
  const searchParams = new URLSearchParams();

  searchParams.set("status", query.status);

  if (query.q.length > 0) {
    searchParams.set("q", query.q);
  }

  if (query.category) {
    searchParams.set("category", query.category);
  }

  if (query.price) {
    searchParams.set("price", query.price);
  }

  if (query.sort !== "newest") {
    searchParams.set("sort", query.sort);
  }

  if (query.page !== 1) {
    searchParams.set("page", String(query.page));
  }

  if (query.pageSize !== 6) {
    searchParams.set("pageSize", String(query.pageSize));
  }

  return searchParams;
}

export function createDashboardListingsSearchParams(
  query: DashboardListingsQuery,
) {
  const searchParams = new URLSearchParams();

  searchParams.set("status", query.status);

  if (query.page !== 1) {
    searchParams.set("page", String(query.page));
  }

  if (query.pageSize !== 6) {
    searchParams.set("pageSize", String(query.pageSize));
  }

  return searchParams;
}

export function getPaginationWindow(
  page: number,
  pageCount: number,
  windowSize = 5,
): PaginationWindow {
  if (pageCount <= 0) {
    return {
      pageCount: 0,
      pageNumbers: [],
    };
  }

  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const boundedWindowSize = Math.max(windowSize, 1);
  const halfWindow = Math.floor(boundedWindowSize / 2);
  let startPage = Math.max(1, currentPage - halfWindow);
  const endPage = Math.min(pageCount, startPage + boundedWindowSize - 1);

  startPage = Math.max(1, endPage - boundedWindowSize + 1);

  return {
    pageCount,
    pageNumbers: Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index,
    ),
  };
}

export function getResultCountRange(
  page: number,
  pageSize: number,
  itemCount: number,
): ResultCountRange {
  if (itemCount === 0) {
    return {
      start: 0,
      end: 0,
    };
  }

  const start = (page - 1) * pageSize + 1;

  return {
    start,
    end: start + itemCount - 1,
  };
}

export function formatResultCount(
  page: number,
  pageSize: number,
  itemCount: number,
  totalCount: number,
) {
  const { start, end } = getResultCountRange(page, pageSize, itemCount);

  return `${start}-${end} of ${totalCount}`;
}
