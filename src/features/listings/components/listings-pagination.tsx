import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import {
  type ListingPageSize,
  listingPageSizes,
} from "@/features/listings/helpers/browse-query";
import { buildHref } from "@/features/listings/helpers/browse-search-params";
import {
  getPageCount,
  getPaginationWindow,
  getResultCountRange,
  hasNextPage,
  hasPreviousPage,
  type PaginatedResult,
} from "@/features/listings/helpers/pagination";
import type { ListingCardData } from "@/features/listings/queries";
import { cn } from "@/lib/utils";

type ListingsPaginationProps = {
  pathname: string;
  searchParams: URLSearchParams;
  pagination: PaginatedResult<ListingCardData>;
};

const paginationLinkClassName =
  "inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function buildPaginationHref(
  pathname: string,
  searchParams: URLSearchParams,
  updates: { page?: number; pageSize?: ListingPageSize },
) {
  const nextSearchParams = new URLSearchParams(searchParams);

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      nextSearchParams.delete("page");
    } else {
      nextSearchParams.set("page", String(updates.page));
    }
  }

  if (updates.pageSize !== undefined) {
    if (updates.pageSize === 6) {
      nextSearchParams.delete("pageSize");
    } else {
      nextSearchParams.set("pageSize", String(updates.pageSize));
    }
  }

  return buildHref(pathname, nextSearchParams);
}

export function ListingsPagination({
  pathname,
  searchParams,
  pagination,
}: ListingsPaginationProps) {
  const { totalCount, page, pageSize, items } = pagination;
  const pageCount = getPageCount(totalCount, pageSize);
  const { start, end } = getResultCountRange(page, pageSize, items.length);
  const { pageNumbers } = getPaginationWindow(page, pageCount);
  const showPreviousPage = hasPreviousPage(page);
  const showNextPage = hasNextPage(page, pageSize, totalCount);

  return (
    <div
      data-sticky-pagination
      className="sticky bottom-0 mt-10 rounded-3xl border border-border/80 bg-[color-mix(in_oklab,var(--color-background)_88%,var(--color-muted)_12%)] px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5"
    >
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <p className="text-sm font-medium text-muted-foreground lg:justify-self-start">
          {start}-{end} of {totalCount}
        </p>

        <nav
          aria-label="Listings pagination"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <Link
            href={buildPaginationHref(pathname, searchParams, {
              page: page - 1,
            })}
            aria-disabled={!showPreviousPage}
            className={cn(
              paginationLinkClassName,
              "border-border/90 bg-background/55 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
              !showPreviousPage && "pointer-events-none opacity-50",
            )}
          >
            <ChevronLeftIcon />
            Previous
          </Link>

          {pageNumbers.map((pageNumber) => {
            const isCurrentPage = pageNumber === page;

            return (
              <Link
                key={pageNumber}
                href={buildPaginationHref(pathname, searchParams, {
                  page: pageNumber,
                })}
                aria-current={isCurrentPage ? "page" : undefined}
                className={cn(
                  paginationLinkClassName,
                  isCurrentPage
                    ? "border-primary/30 bg-primary/90 text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_22%,transparent),0_0_28px_color-mix(in_oklab,var(--color-primary)_28%,transparent),inset_0_1px_0_color-mix(in_oklab,white_14%,transparent)]"
                    : "border-border/90 bg-background/55 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
                  "px-0",
                )}
              >
                {pageNumber}
              </Link>
            );
          })}

          <Link
            href={buildPaginationHref(pathname, searchParams, {
              page: page + 1,
            })}
            aria-disabled={!showNextPage}
            className={cn(
              paginationLinkClassName,
              "border-border/90 bg-background/55 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
              !showNextPage && "pointer-events-none opacity-50",
            )}
          >
            Next
            <ChevronRightIcon />
          </Link>
        </nav>

        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-self-end">
          {listingPageSizes.map((nextPageSize) => {
            const isActive = nextPageSize === pageSize;

            return (
              <Link
                key={nextPageSize}
                href={buildPaginationHref(pathname, searchParams, {
                  page: 1,
                  pageSize: nextPageSize,
                })}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  paginationLinkClassName,
                  isActive
                    ? "border-primary/30 bg-primary/90 text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-primary)_22%,transparent),0_0_28px_color-mix(in_oklab,var(--color-primary)_28%,transparent),inset_0_1px_0_color-mix(in_oklab,white_14%,transparent)]"
                    : "border-border/90 bg-background/55 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
                  "min-w-10",
                )}
              >
                {nextPageSize}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
