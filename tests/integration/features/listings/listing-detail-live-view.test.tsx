import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingDetailLiveView } from "@/features/listings/components/listing-detail-live-view";
import type { ListingDetailData } from "@/features/listings/queries";

const hoisted = vi.hoisted(() => ({
  refresh: vi.fn(),
  subscribe: vi.fn(),
  emitBidPlaced: null as null | ((event: Record<string, unknown>) => void),
  emitLifecycleChanged: null as
    | null
    | ((event: Record<string, unknown>) => void),
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    useRouter: () => ({
      refresh: hoisted.refresh,
    }),
  };
});

vi.mock("@/features/realtime/provider", () => ({
  useListingBidPlacedSubscription: vi.fn(
    (_listingId: string, onEvent: (event: Record<string, unknown>) => void) => {
      hoisted.emitBidPlaced = onEvent;
    },
  ),
  useListingLifecycleChangedSubscription: vi.fn(
    (_listingId: string, onEvent: (event: Record<string, unknown>) => void) => {
      hoisted.emitLifecycleChanged = onEvent;
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
    outcome: null,
    highestBidderId: null,
    viewerBidStatus: "none",
    canPlaceBid: true,
    reservePriceCents: null,
    winnerUserId: null,
    winningBidId: null,
    aiDescriptionGenerationCount: 0,
    startsAt: null,
    endsAt: new Date("2026-04-10T12:00:00.000Z"),
    bidHistory: [],
    images: [],
    ...overrides,
  };
}

describe("ListingDetailLiveView", () => {
  beforeEach(() => {
    hoisted.refresh.mockReset();
    hoisted.emitBidPlaced = null;
    hoisted.emitLifecycleChanged = null;
    vi.useRealTimers();
  });

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

  it("locks bidding locally at zero and refreshes once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T11:59:59.000Z"));

    render(
      <ListingDetailLiveView
        initialListing={createListingDetail({
          endsAt: new Date("2026-04-10T12:00:00.000Z"),
        })}
        viewerId="buyer-1"
      />,
    );

    expect(screen.getByText("Place A Bid")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Auction Finalizing")).toBeInTheDocument();
    expect(screen.getAllByText("Auction closing now").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("Current 45000")).not.toBeInTheDocument();
    expect(hoisted.refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(hoisted.refresh).toHaveBeenCalledTimes(1);
  });

  it("reconciles lifecycle updates into the final ended state", async () => {
    render(
      <ListingDetailLiveView
        initialListing={createListingDetail()}
        viewerId="buyer-1"
      />,
    );

    await act(async () => {
      hoisted.emitLifecycleChanged?.({
        listingId: "listing-1",
        status: "ended",
        outcome: "sold",
        endedAt: "2026-04-10T12:00:00.000Z",
        winnerUserId: "buyer-2",
        winningBidId: "bid-9",
        currentBidCents: 52_000,
        bidCount: 3,
      });
    });

    expect(screen.getByText("Auction Result")).toBeInTheDocument();
    expect(screen.getAllByText("Winning bid confirmed").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("Current 45000")).not.toBeInTheDocument();
  });

  it("shows seller-only reserve_not_met messaging while suppressing it for buyers", () => {
    const { rerender } = render(
      <ListingDetailLiveView
        initialListing={createListingDetail({
          status: "ended",
          outcome: "reserve_not_met",
          bidCount: 2,
        })}
        viewerId="seller-1"
      />,
    );

    expect(screen.getAllByText("Reserve Not Met").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("The reserve was not met").length,
    ).toBeGreaterThan(0);

    rerender(
      <ListingDetailLiveView
        initialListing={createListingDetail({
          status: "ended",
          outcome: "reserve_not_met",
          bidCount: 2,
        })}
        viewerId="buyer-1"
      />,
    );

    expect(screen.queryByText("Reserve Not Met")).not.toBeInTheDocument();
    expect(screen.getAllByText("This lot did not sell").length).toBeGreaterThan(
      0,
    );
  });
});
