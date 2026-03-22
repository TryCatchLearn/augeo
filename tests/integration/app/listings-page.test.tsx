import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ListingCardData } from "@/features/listings/queries";

const mockListPublicListingCards = vi.fn<() => Promise<ListingCardData[]>>();

vi.mock("@/features/listings/queries", () => ({
  listPublicListingCards: mockListPublicListingCards,
}));

describe("Listings page", () => {
  it("renders public listing cards that link to listing detail pages", async () => {
    mockListPublicListingCards.mockResolvedValue([
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
    ]);

    const { default: ListingsPage } = await import("@/app/listings/page");

    render(await ListingsPage());

    expect(screen.getByText("Public Camera")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Public Camera" })).toHaveAttribute(
      "href",
      "/listings/listing-1",
    );
  });
});
