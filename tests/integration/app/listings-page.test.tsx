import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ListingCardData,
  PaginatedListingCardResult,
} from "@/features/listings/queries";

const mockListPublicListingCards =
  vi.fn<() => Promise<PaginatedListingCardResult>>();
const mockPublicListingsControls = vi.fn();

vi.mock("@/features/listings/queries", () => ({
  listPublicListingCards: mockListPublicListingCards,
  normalizePublicListingsQuery: vi.fn(
    (
      input:
        | {
            status?: string;
            q?: string;
            category?: string;
            price?: string;
            sort?: string;
            page?: string;
            pageSize?: string;
          }
        | undefined,
    ) => ({
      status: input?.status === "scheduled" ? "scheduled" : "active",
      q: input?.q?.trim() ?? "",
      category: input?.category === "electronics" ? "electronics" : null,
      price: input?.price === "lt_50" ? "lt_50" : null,
      sort: input?.sort === "price_desc" ? "price_desc" : "newest",
      page: input?.page ? Number(input.page) : 1,
      pageSize: input?.pageSize ? Number(input.pageSize) : 6,
    }),
  ),
}));

vi.mock("@/features/listings/components/public-listings-controls", () => ({
  PublicListingsControls: (props: unknown) => {
    mockPublicListingsControls(props);

    return <div data-testid="public-listings-controls" />;
  },
}));

function createListingsResult(
  items: ListingCardData[],
): PaginatedListingCardResult {
  return {
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 6,
    pageCount: items.length > 0 ? 1 : 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

describe("Listings page", () => {
  it("renders public listing cards that link to listing detail pages", async () => {
    mockListPublicListingCards.mockResolvedValue(
      createListingsResult([
        {
          id: "listing-1",
          title: "Public Camera",
          status: "active",
          startingBidCents: 25000,
          bidCount: 0,
          sellerName: "Seller One",
          endsAt: new Date("2026-03-21T18:00:00.000Z"),
          imageUrl: "https://picsum.photos/seed/public-camera/1200/900",
        },
      ]),
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
    mockListPublicListingCards.mockResolvedValue(createListingsResult([]));

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
  });

  it("falls back to the active tab when the public status is invalid", async () => {
    mockListPublicListingCards.mockResolvedValue(createListingsResult([]));

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
    mockListPublicListingCards.mockResolvedValue(createListingsResult([]));

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
});
