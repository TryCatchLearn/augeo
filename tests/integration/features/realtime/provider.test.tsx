import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RealtimeProvider } from "@/features/realtime/provider";

type MockChannel = {
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  listeners: Map<string, (event: Record<string, unknown>) => void>;
};

const hoisted = vi.hoisted(() => {
  const channels = new Map<string, MockChannel>();
  const getOrCreateChannel = (name: string) => {
    const existing = channels.get(name);

    if (existing) {
      return existing;
    }

    const channel: MockChannel = {
      subscribe: vi.fn(
        (
          eventName: string,
          listener: (event: Record<string, unknown>) => void,
        ) => {
          channel.listeners.set(eventName, listener);
        },
      ),
      unsubscribe: vi.fn(
        (
          eventName: string,
          listener: (event: Record<string, unknown>) => void,
        ) => {
          if (channel.listeners.get(eventName) === listener) {
            channel.listeners.delete(eventName);
          }
        },
      ),
      listeners: new Map(),
    };

    channels.set(name, channel);

    return channel;
  };

  const createClient = () => ({
    close: vi.fn(),
    channels: {
      get: vi.fn((name: string) => getOrCreateChannel(name)),
    },
  });

  return {
    channels,
    pathname: "/",
    realtimeConstructor: vi.fn(function MockRealtime() {
      return createClient();
    }),
    toastCustom: vi.fn(),
  };
});

vi.mock("ably", () => ({
  Realtime: hoisted.realtimeConstructor,
}));

vi.mock("sonner", () => ({
  toast: {
    custom: hoisted.toastCustom,
  },
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    usePathname: () => hoisted.pathname,
  };
});

describe("RealtimeProvider", () => {
  it("creates one shared client per mounted provider tree", async () => {
    hoisted.pathname = "/listings";
    hoisted.channels.clear();
    hoisted.realtimeConstructor.mockClear();

    render(
      <RealtimeProvider viewerId={null}>
        <div>one</div>
        <div>two</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(hoisted.realtimeConstructor).toHaveBeenCalledTimes(1);
    });
  });

  it("connects and disconnects guests as routes change", async () => {
    hoisted.pathname = "/listings";
    hoisted.channels.clear();
    hoisted.realtimeConstructor.mockClear();

    const { rerender } = render(
      <RealtimeProvider viewerId={null}>
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(hoisted.realtimeConstructor).toHaveBeenCalledTimes(1);
    });

    const firstClient = hoisted.realtimeConstructor.mock.results[0]?.value;

    hoisted.pathname = "/";
    rerender(
      <RealtimeProvider viewerId={null}>
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(firstClient.close).toHaveBeenCalledTimes(1);
    });
  });

  it("reuses the authenticated connection across pages", async () => {
    hoisted.pathname = "/listings";
    hoisted.channels.clear();
    hoisted.realtimeConstructor.mockClear();

    const { rerender } = render(
      <RealtimeProvider viewerId="user-1">
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(hoisted.realtimeConstructor).toHaveBeenCalledTimes(1);
    });

    const firstClient = hoisted.realtimeConstructor.mock.results[0]?.value;

    hoisted.pathname = "/dashboard";
    rerender(
      <RealtimeProvider viewerId="user-1">
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(hoisted.realtimeConstructor).toHaveBeenCalledTimes(1);
    });
    expect(firstClient.close).not.toHaveBeenCalled();
  });

  it("subscribes authenticated users to their user channel globally", async () => {
    hoisted.pathname = "/dashboard";
    hoisted.channels.clear();
    hoisted.realtimeConstructor.mockClear();

    render(
      <RealtimeProvider viewerId="user-1">
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(
        hoisted.channels.get("user:user-1")?.subscribe,
      ).toHaveBeenCalledWith("notification.created", expect.any(Function));
    });
  });

  it("never subscribes guests to a user channel", async () => {
    hoisted.pathname = "/listings";
    hoisted.channels.clear();
    hoisted.realtimeConstructor.mockClear();

    render(
      <RealtimeProvider viewerId={null}>
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(hoisted.realtimeConstructor).toHaveBeenCalledTimes(1);
    });

    expect(hoisted.channels.has("user:user-1")).toBe(false);
  });

  it("shows a deduped notification toast with a listing CTA", async () => {
    hoisted.pathname = "/dashboard";
    hoisted.channels.clear();
    hoisted.realtimeConstructor.mockClear();
    hoisted.toastCustom.mockClear();

    render(
      <RealtimeProvider viewerId="user-1">
        <div>child</div>
      </RealtimeProvider>,
    );

    await waitFor(() => {
      expect(
        hoisted.channels
          .get("user:user-1")
          ?.listeners.get("notification.created"),
      ).toBeDefined();
    });

    const notificationEvent = {
      notificationId: "notification-1",
      type: "outbid",
      listingId: "listing-1",
      title: "You've been outbid",
      message: "New current bid $500.00 across 2 bids. Next bid $510.00.",
      listingUrl: "/listings/listing-1",
      createdAt: "2026-04-02T12:00:00.000Z",
      readAt: null,
      icon: "gavel",
      outcome: null,
    };

    await act(async () => {
      hoisted.channels
        .get("user:user-1")
        ?.listeners.get("notification.created")?.({
        data: notificationEvent,
      });
      hoisted.channels
        .get("user:user-1")
        ?.listeners.get("notification.created")?.({
        data: notificationEvent,
      });
    });

    expect(hoisted.toastCustom).toHaveBeenCalledTimes(1);
    expect(hoisted.toastCustom).toHaveBeenCalledWith(expect.any(Function), {
      id: "notification-1",
    });

    const renderToast = hoisted.toastCustom.mock
      .calls[0]?.[0] as () => React.ReactNode;

    render(renderToast());

    expect(screen.getByText("You've been outbid")).toBeInTheDocument();
    expect(
      screen.getByText(
        "New current bid $500.00 across 2 bids. Next bid $510.00.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View listing" })).toHaveAttribute(
      "href",
      "/listings/listing-1",
    );
  });
});
