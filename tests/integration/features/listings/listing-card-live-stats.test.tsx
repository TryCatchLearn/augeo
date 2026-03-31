import { act, render, screen, waitFor } from "@testing-library/react";
import type { RealtimeClient } from "ably";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListingCardLiveStats } from "@/features/listings/components/listing-card-live-stats";
import { RealtimeProvider } from "@/features/realtime/provider";

type Listener = (message: { data: Record<string, unknown> }) => void;

const hoisted = vi.hoisted(() => ({
  pathname: "/listings",
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    usePathname: () => hoisted.pathname,
  };
});

function createRealtimeClient() {
  const listeners = new Map<string, Listener[]>();
  const channels = new Map<
    string,
    {
      subscribe: ReturnType<typeof vi.fn>;
      unsubscribe: ReturnType<typeof vi.fn>;
    }
  >();

  const getChannelListeners = (channelName: string) =>
    listeners.get(channelName) ?? [];

  return {
    client: {
      close: vi.fn(),
      channels: {
        get: vi.fn((channelName: string) => {
          if (!channels.has(channelName)) {
            channels.set(channelName, {
              subscribe: vi.fn(
                async (_eventName: string, listener: Listener) => {
                  listeners.set(channelName, [
                    ...getChannelListeners(channelName),
                    listener,
                  ]);
                },
              ),
              unsubscribe: vi.fn((_eventName: string, listener: Listener) => {
                listeners.set(
                  channelName,
                  getChannelListeners(channelName).filter(
                    (entry) => entry !== listener,
                  ),
                );
              }),
            });
          }

          return channels.get(channelName);
        }),
      },
    } as unknown as RealtimeClient,
    emit(channelName: string, event: Record<string, unknown>) {
      for (const listener of getChannelListeners(channelName)) {
        listener({ data: event });
      }
    },
    getChannel(channelName: string) {
      return channels.get(channelName);
    },
  };
}

describe("ListingCardLiveStats", () => {
  beforeEach(() => {
    hoisted.pathname = "/listings";
  });

  it("updates the displayed price and bid count after bid.placed", async () => {
    const realtime = createRealtimeClient();

    render(
      <RealtimeProvider viewerId={null} createClient={() => realtime.client}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    expect(screen.getByText("$250.00")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    await act(async () => {
      realtime.emit("listing:listing-1", {
        listingId: "listing-1",
        currentBidCents: 31_000,
        bidCount: 2,
        minimumNextBidCents: 32_000,
        highestBidderId: "buyer-2",
        bid: {
          id: "bid-2",
          bidderId: "buyer-2",
          bidderName: "Buyer Two",
          amountCents: 31_000,
          createdAt: "2026-04-01T12:00:00.000Z",
        },
      });
    });

    expect(screen.getByText("$310.00")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("unsubscribes from the listing channel when the card unmounts", async () => {
    const realtime = createRealtimeClient();

    const { unmount } = render(
      <RealtimeProvider viewerId={null} createClient={() => realtime.client}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(
        realtime.getChannel("listing:listing-1")?.subscribe,
      ).toHaveBeenCalledTimes(1);
    });

    unmount();

    expect(
      realtime.getChannel("listing:listing-1")?.unsubscribe,
    ).toHaveBeenCalledTimes(1);
  });

  it("reuses the shared realtime connection across multiple live cards", async () => {
    const realtime = createRealtimeClient();
    const createClient = vi.fn(() => realtime.client);

    render(
      <RealtimeProvider viewerId={null} createClient={createClient}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
        <ListingCardLiveStats
          listingId="listing-2"
          currentPriceCents={40_000}
          bidCount={3}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledTimes(1);
    });
    expect(realtime.client.channels.get).toHaveBeenCalledTimes(2);
  });

  it("uses the guest route-scoped connection policy for public listing cards", async () => {
    hoisted.pathname = "/";
    const realtime = createRealtimeClient();
    const createClient = vi.fn(() => realtime.client);

    const { rerender } = render(
      <RealtimeProvider viewerId={null} createClient={createClient}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledTimes(0);
    });

    hoisted.pathname = "/listings";
    rerender(
      <RealtimeProvider viewerId={null} createClient={createClient}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    hoisted.pathname = "/";
    rerender(
      <RealtimeProvider viewerId={null} createClient={createClient}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(realtime.client.close).toHaveBeenCalledTimes(1);
    });
  });

  it("reuses the authenticated connection for dashboard cards across route changes", async () => {
    hoisted.pathname = "/dashboard/listings";
    const realtime = createRealtimeClient();
    const createClient = vi.fn(() => realtime.client);

    const { rerender } = render(
      <RealtimeProvider viewerId="seller-1" createClient={createClient}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    hoisted.pathname = "/dashboard";
    rerender(
      <RealtimeProvider viewerId="seller-1" createClient={createClient}>
        <ListingCardLiveStats
          listingId="listing-1"
          currentPriceCents={25_000}
          bidCount={0}
        />
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledTimes(1);
    });
    expect(realtime.client.close).not.toHaveBeenCalled();
  });
});
