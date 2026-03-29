import type { ListingPageSize } from "@/features/listings/helpers/browse-query";

export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
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

export function getPageCount(totalCount: number, pageSize: number) {
  return totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
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

export function hasPreviousPage(page: number) {
  return page > 1;
}

export function hasNextPage(
  page: number,
  pageSize: number,
  totalCount: number,
) {
  return page * pageSize < totalCount;
}
