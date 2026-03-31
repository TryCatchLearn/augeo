import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RealtimeProvider } from "@/features/realtime/provider";

const hoisted = vi.hoisted(() => {
  const channels = new Map();
  const createClient = () => ({
    close: vi.fn(),
    channels: {
      get: vi.fn((name: string) => {
        if (!channels.has(name)) {
          channels.set(name, {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
          });
        }

        return channels.get(name);
      }),
    },
  });

  return {
    pathname: "/",
    realtimeConstructor: vi.fn(function MockRealtime() {
      return createClient();
    }),
  };
});

vi.mock("ably", () => ({
  Realtime: hoisted.realtimeConstructor,
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
});
