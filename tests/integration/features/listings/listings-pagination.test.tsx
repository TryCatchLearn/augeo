import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingsPagination } from "@/features/listings/components/listings-pagination";
import type { PaginatedListingCardResult } from "@/features/listings/queries";

function createPaginationResult(
  overrides: Partial<PaginatedListingCardResult> = {},
): PaginatedListingCardResult {
  return {
    items: [],
    totalCount: 14,
    page: 2,
    pageSize: 6,
    startResult: 7,
    endResult: 12,
    pageCount: 3,
    pageNumbers: [1, 2, 3],
    hasPreviousPage: true,
    hasNextPage: true,
    ...overrides,
  };
}

describe("ListingsPagination", () => {
  it("preserves active public browse state in page links", () => {
    render(
      <ListingsPagination
        pathname="/listings"
        searchParams={
          new URLSearchParams(
            "status=scheduled&q=desk+lamp&category=electronics&price=lt_50&sort=price_desc&page=2&pageSize=12",
          )
        }
        pagination={createPaginationResult({ pageSize: 12 })}
      />,
    );

    expect(screen.getByText("7-12 of 14")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/listings?status=scheduled&q=desk+lamp&category=electronics&price=lt_50&sort=price_desc&pageSize=12",
    );
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute(
      "href",
      "/listings?status=scheduled&q=desk+lamp&category=electronics&price=lt_50&sort=price_desc&page=3&pageSize=12",
    );
  });

  it("resets to page 1 when the page size changes", () => {
    render(
      <ListingsPagination
        pathname="/dashboard/listings"
        searchParams={new URLSearchParams("status=active&page=3&pageSize=12")}
        pagination={createPaginationResult({ page: 3, pageSize: 12 })}
      />,
    );

    expect(screen.getByRole("link", { name: "24" })).toHaveAttribute(
      "href",
      "/dashboard/listings?status=active&pageSize=24",
    );
  });

  it("renders the sticky pagination hook and empty result count", () => {
    const { container } = render(
      <ListingsPagination
        pathname="/listings"
        searchParams={new URLSearchParams("status=active")}
        pagination={createPaginationResult({
          totalCount: 0,
          page: 1,
          startResult: 0,
          endResult: 0,
          pageCount: 0,
          pageNumbers: [],
          hasPreviousPage: false,
          hasNextPage: false,
        })}
      />,
    );

    expect(screen.getByText("0-0 of 0")).toBeInTheDocument();
    expect(container.querySelector("[data-sticky-pagination]")).not.toBeNull();
  });
});
