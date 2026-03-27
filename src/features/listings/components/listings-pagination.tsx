import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import {
  type ListingPageSize,
  listingPageSizes,
} from "@/features/listings/browse";
import type { PaginatedListingCardResult } from "@/features/listings/queries";
import { cn } from "@/lib/utils";

type ListingsPaginationProps = {
  pathname: string;
  searchParams: URLSearchParams;
  pagination: PaginatedListingCardResult;
};

const paginationLinkClassName =
  "inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function buildHref(
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

  const queryString = nextSearchParams.toString();

  return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
}

export function ListingsPagination({
  pathname,
  searchParams,
  pagination,
}: ListingsPaginationProps) {
  const {
    totalCount,
    page,
    pageSize,
    startResult,
    endResult,
    pageNumbers,
    hasPreviousPage,
    hasNextPage,
  } = pagination;

  return (
    <div
      data-sticky-pagination
      className="sticky bottom-0 mt-10 rounded-3xl border border-border/80 bg-[color-mix(in_oklab,var(--color-background)_88%,var(--color-muted)_12%)] px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5"
    >
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <p className="text-sm font-medium text-muted-foreground lg:justify-self-start">
          {startResult}-{endResult} of {totalCount}
        </p>

        <nav
          aria-label="Listings pagination"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <Link
            href={buildHref(pathname, searchParams, { page: page - 1 })}
            aria-disabled={!hasPreviousPage}
            className={cn(
              paginationLinkClassName,
              "border-border/90 bg-background/55 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
              !hasPreviousPage && "pointer-events-none opacity-50",
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
                href={buildHref(pathname, searchParams, { page: pageNumber })}
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
            href={buildHref(pathname, searchParams, { page: page + 1 })}
            aria-disabled={!hasNextPage}
            className={cn(
              paginationLinkClassName,
              "border-border/90 bg-background/55 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_10%,transparent),inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-sm hover:border-primary/35 hover:bg-muted/80 hover:text-foreground",
              !hasNextPage && "pointer-events-none opacity-50",
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
                href={buildHref(pathname, searchParams, {
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
