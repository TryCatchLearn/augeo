import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaginatedResult } from "@/features/listings/helpers/pagination";
import type { ListingCardData } from "@/features/listings/queries";
import {
  createListingCardData,
  createPaginatedResult,
} from "../../helpers/listings";

const mockListPublicListingCards =
  vi.fn<() => Promise<PaginatedResult<ListingCardData>>>();
const mockPublicListingsControls = vi.fn();
const mockListingsPagination = vi.fn();

vi.mock("@/features/listings/queries", () => ({
  listPublicListingCards: mockListPublicListingCards,
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      refresh: vi.fn(),
    }),
  };
});

vi.mock("@/features/listings/components/public-listings-controls", () => ({
  PublicListingsControls: (props: unknown) => {
    mockPublicListingsControls(props);

    return <div data-testid="public-listings-controls" />;
  },
}));

vi.mock("@/features/listings/components/listings-pagination", () => ({
  ListingsPagination: (props: unknown) => {
    mockListingsPagination(props);

    return <div data-testid="listings-pagination" />;
  },
}));

describe("Listings page", () => {
  beforeEach(() => {
    mockListPublicListingCards.mockReset();
    mockPublicListingsControls.mockReset();
    mockListingsPagination.mockReset();
  });

  it("renders public listing cards that link to listing detail pages", async () => {
    mockListPublicListingCards.mockResolvedValue(
      createPaginatedResult([createListingCardData()]),
    );

    const { default: ListingsPage } = await import("@/app/listings/page");

    render(await ListingsPage());

    expect(screen.getByText("Public Camera")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Public Camera" })).toHaveAttribute(
      "href",
      "/listings/listing-1",
    );
  });

  it("renders URL-backed public status tabs below the heading", async () => {
    mockListPublicListingCards.mockResolvedValue(createPaginatedResult([]));

    const { default: ListingsPage } = await import("@/app/listings/page");

    render(
      await ListingsPage({
        searchParams: Promise.resolve({ status: "scheduled" }),
      }),
    );

    expect(
      screen.getByRole("navigation", { name: "Public listing status tabs" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute(
      "href",
      "/listings?status=active",
    );
    expect(screen.getByRole("link", { name: "Scheduled" })).toHaveAttribute(
      "href",
      "/listings?status=scheduled",
    );
    expect(screen.getByRole("link", { name: "Scheduled" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("public-listings-controls")).toBeInTheDocument();
    expect(screen.getByTestId("listings-pagination")).toBeInTheDocument();
  });

  it("falls back to the active tab when the public status is invalid", async () => {
    mockListPublicListingCards.mockResolvedValue(createPaginatedResult([]));

    const { default: ListingsPage } = await import("@/app/listings/page");

    render(
      await ListingsPage({
        searchParams: Promise.resolve({ status: "mystery" }),
      }),
    );

    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("passes the normalized filter and sort query into the controls row", async () => {
    mockListPublicListingCards.mockResolvedValue(createPaginatedResult([]));

    const { default: ListingsPage } = await import("@/app/listings/page");

    render(
      await ListingsPage({
        searchParams: Promise.resolve({
          status: "active",
          category: "electronics",
          price: "lt_50",
          sort: "price_desc",
          page: "2",
          pageSize: "12",
        }),
      }),
    );

    expect(mockPublicListingsControls).toHaveBeenCalledWith({
      query: {
        status: "active",
        q: "",
        category: "electronics",
        price: "lt_50",
        sort: "price_desc",
        page: 2,
        pageSize: 12,
      },
    });
  });

  it("passes the shared browse state into pagination links", async () => {
    mockListPublicListingCards.mockResolvedValue(createPaginatedResult([]));

    const { default: ListingsPage } = await import("@/app/listings/page");

    render(
      await ListingsPage({
        searchParams: Promise.resolve({
          status: "scheduled",
          q: "camera",
          category: "electronics",
          price: "lt_50",
          sort: "price_desc",
          page: "2",
          pageSize: "12",
        }),
      }),
    );

    const paginationProps = mockListingsPagination.mock.calls.at(-1)?.[0] as {
      pathname: string;
      searchParams: URLSearchParams;
      pagination: PaginatedResult<ListingCardData>;
    };

    expect(paginationProps.pathname).toBe("/listings");
    expect(paginationProps.searchParams.toString()).toBe(
      "status=scheduled&q=camera&category=electronics&price=lt_50&sort=price_desc&page=2&pageSize=12",
    );
    expect(paginationProps.pagination).toEqual(createPaginatedResult([]));
  });
});
