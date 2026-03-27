import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ListingCardData,
  PaginatedListingCardResult,
} from "@/features/listings/queries";

const mockListPublicListingCards =
  vi.fn<() => Promise<PaginatedListingCardResult>>();

vi.mock("@/features/listings/queries", () => ({
  listPublicListingCards: mockListPublicListingCards,
  normalizePublicListingsQuery: vi.fn(
    (input: { status?: string } | undefined) => ({
      status: input?.status === "scheduled" ? "scheduled" : "active",
      page: 1,
      pageSize: 6,
    }),
  ),
  publicListingStatuses: ["active", "scheduled", "ended"],
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
});
