import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingCard } from "@/features/listings/components/listing-card";
import type { ListingCardData } from "@/features/listings/queries";

const hoisted = vi.hoisted(() => ({
  refresh: vi.fn(),
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

vi.mock("@/features/listings/components/listing-card-live-stats", () => ({
  ListingCardLiveStats: ({
    currentPriceCents,
    bidCount,
  }: {
    currentPriceCents: number;
    bidCount: number;
  }) => (
    <div>
      <div>{`Current ${currentPriceCents}`}</div>
      <div>{`Bids ${bidCount}`}</div>
    </div>
  ),
}));

vi.mock("@/features/realtime/provider", () => ({
  useListingLifecycleChangedSubscription: vi.fn(
    (_listingId: string, onEvent: (event: Record<string, unknown>) => void) => {
      hoisted.emitLifecycleChanged = onEvent;
    },
  ),
}));

function createListingCard(
  overrides: Partial<ListingCardData> = {},
): ListingCardData {
  return {
    id: "listing-1",
    sellerId: "seller-1",
    title: "Collector Camera",
    status: "active",
    outcome: null,
    startingBidCents: 45_000,
    currentPriceCents: 45_000,
    bidCount: 0,
    sellerName: "Seller One",
    endsAt: new Date("2026-04-10T12:00:00.000Z"),
    imageUrl: null,
    ...overrides,
  };
}

describe("ListingCard", () => {
  beforeEach(() => {
    hoisted.refresh.mockReset();
    hoisted.emitLifecycleChanged = null;
    vi.useRealTimers();
  });

  it("switches into local finalizing UI at zero and refreshes once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T11:59:59.000Z"));

    render(
      <ListingCard
        listing={createListingCard({
          endsAt: new Date("2026-04-10T12:00:00.000Z"),
        })}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Auction closing now")).toBeInTheDocument();
    expect(screen.getAllByText("Finalizing").length).toBeGreaterThan(0);
    expect(hoisted.refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(hoisted.refresh).toHaveBeenCalledTimes(1);
  });

  it("reconciles ended lifecycle updates for public viewers without exposing reserve_not_met", async () => {
    render(<ListingCard listing={createListingCard()} />);

    await act(async () => {
      hoisted.emitLifecycleChanged?.({
        listingId: "listing-1",
        status: "ended",
        outcome: "reserve_not_met",
        endedAt: "2026-04-10T12:00:00.000Z",
        winnerUserId: null,
        winningBidId: null,
        currentBidCents: 48_000,
        bidCount: 3,
      });
    });

    expect(screen.getByText("This lot did not sell")).toBeInTheDocument();
    expect(screen.queryByText("Reserve Not Met")).not.toBeInTheDocument();
  });

  it("preserves reserve_not_met messaging for the seller view", () => {
    render(
      <ListingCard
        listing={createListingCard({
          status: "ended",
          outcome: "reserve_not_met",
          bidCount: 2,
        })}
        viewerId="seller-1"
      />,
    );

    expect(screen.getByText("Reserve Not Met")).toBeInTheDocument();
    expect(screen.getByText("The reserve was not met")).toBeInTheDocument();
  });
});
