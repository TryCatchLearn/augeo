import type {
  DashboardListingsQuery,
  PublicListingsQuery,
} from "@/features/listings/helpers/browse-query";

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

export function buildHref(pathname: string, searchParams: URLSearchParams) {
  const queryString = searchParams.toString();

  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}
