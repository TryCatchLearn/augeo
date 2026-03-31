import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListingDetailLiveView } from "@/features/listings/components/listing-detail-live-view";
import type { ListingDetailData } from "@/features/listings/queries";

const hoisted = vi.hoisted(() => ({
  subscribe: vi.fn(),
  emitBidPlaced: null as null | ((event: Record<string, unknown>) => void),
}));

vi.mock("@/features/realtime/provider", () => ({
  useListingBidPlacedSubscription: vi.fn(
    (_listingId: string, onEvent: (event: Record<string, unknown>) => void) => {
      hoisted.emitBidPlaced = onEvent;
    },
  ),
}));

vi.mock("@/features/listings/components/listing-bid-form", () => ({
  ListingBidForm: ({
    bidCount,
    currentPriceCents,
    minimumNextBidCents,
    viewerBidStatus,
  }: {
    bidCount: number;
    currentPriceCents: number;
    minimumNextBidCents: number;
    viewerBidStatus: string;
  }) => (
    <div>
      <div>{`${bidCount} bids`}</div>
      <div>{`Current ${currentPriceCents}`}</div>
      <div>{`Minimum ${minimumNextBidCents}`}</div>
      <div>{viewerBidStatus}</div>
    </div>
  ),
}));

vi.mock("@/features/listings/components/listing-seller-controls", () => ({
  ListingSellerControls: () => (
    <div>
      <button type="button">Publish</button>
    </div>
  ),
}));

vi.mock("@/features/listings/components/listing-image-gallery", () => ({
  ListingImageGallery: () => <div>Gallery</div>,
}));

vi.mock("@/features/listings/components/listing-image-upload-panel", () => ({
  ListingImageUploadPanel: () => <div>Upload Panel</div>,
}));

function createListingDetail(
  overrides: Partial<ListingDetailData> = {},
): ListingDetailData {
  return {
    id: "listing-1",
    sellerId: "seller-1",
    sellerName: "Seller One",
    title: "Collector Camera",
    description: "Beautiful condition and ready for bidding.",
    location: "Portland, OR",
    category: "electronics",
    condition: "like_new",
    status: "active",
    startingBidCents: 45000,
    currentBidCents: null,
    currentPriceCents: 45000,
    minimumNextBidCents: 45000,
    bidCount: 0,
    highestBidderId: null,
    viewerBidStatus: "none",
    canPlaceBid: true,
    reservePriceCents: null,
    aiDescriptionGenerationCount: 0,
    startsAt: null,
    endsAt: new Date("2026-04-10T12:00:00.000Z"),
    bidHistory: [],
    images: [],
    ...overrides,
  };
}

describe("ListingDetailLiveView", () => {
  it("reacts to bid.placed updates", async () => {
    render(
      <ListingDetailLiveView
        initialListing={createListingDetail({
          viewerBidStatus: "outbid",
          bidHistory: [
            {
              id: "bid-1",
              bidderId: "viewer-1",
              bidderName: "Buyer One",
              amountCents: 45000,
              createdAt: new Date("2026-04-01T10:00:00.000Z"),
            },
          ],
        })}
        viewerId="seller-1"
      />,
    );

    expect(screen.getByText("Seller Controls")).toBeInTheDocument();

    await act(async () => {
      hoisted.emitBidPlaced?.({
        listingId: "listing-1",
        currentBidCents: 50000,
        bidCount: 1,
        minimumNextBidCents: 51000,
        highestBidderId: "buyer-2",
        bid: {
          id: "bid-2",
          bidderId: "buyer-2",
          bidderName: "Buyer Two",
          amountCents: 50000,
          createdAt: "2026-04-01T11:00:00.000Z",
        },
      });
    });

    expect(screen.getByText("Auction Activity")).toBeInTheDocument();
    expect(screen.getAllByText("$500.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$510.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Bids")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("Buyer Two").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeInTheDocument();
  });
});
