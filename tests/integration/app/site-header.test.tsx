import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getSession: vi.fn(),
  push: vi.fn(),
  pathname: "/",
  searchParams: new URLSearchParams(),
  getUnreadNotificationCount: vi.fn(),
  listRecentNotifications: vi.fn(),
}));

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    usePathname: () => hoisted.pathname,
    useRouter: () => ({
      push: hoisted.push,
    }),
    useSearchParams: () => hoisted.searchParams,
  };
});

vi.mock("@/features/auth/session", () => ({
  getSession: hoisted.getSession,
}));

vi.mock("@/components/user-nav", () => ({
  UserNav: () => <div>User nav</div>,
}));

vi.mock("@/features/notifications/components/notification-bell", () => ({
  NotificationBell: () => <div>Notification bell</div>,
}));

vi.mock("@/features/notifications/queries", () => ({
  getUnreadNotificationCount: hoisted.getUnreadNotificationCount,
  listRecentNotifications: hoisted.listRecentNotifications,
}));

vi.mock("@/features/notifications/actions", () => ({
  markNotificationReadAction: vi.fn(),
  markAllNotificationsReadAction: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: {},
}));

vi.mock("@/features/listings/components/auction-lifecycle-dev-button", () => ({
  AuctionLifecycleDevButton: () => (
    <div data-testid="dev-lifecycle-trigger">Lifecycle trigger</div>
  ),
}));

vi.mock("@/features/listings/lifecycle-actions", () => ({
  runAuctionLifecycleDevAction: vi.fn(),
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    hoisted.getSession.mockReset();
    hoisted.getSession.mockResolvedValue(null);
    hoisted.push.mockReset();
    hoisted.pathname = "/";
    hoisted.searchParams = new URLSearchParams();
    hoisted.getUnreadNotificationCount.mockReset();
    hoisted.getUnreadNotificationCount.mockResolvedValue(0);
    hoisted.listRecentNotifications.mockReset();
    hoisted.listRecentNotifications.mockResolvedValue([]);
  });

  it("renders the always-visible listing search in the header", async () => {
    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    expect(
      screen.getByRole("searchbox", { name: "Search listings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit listing search" }),
    ).toBeInTheDocument();
  });

  it("submits only on explicit submit from non-listings routes", async () => {
    hoisted.pathname = "/sell";

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "  camera  " },
      },
    );

    expect(hoisted.push).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Submit listing search" }),
    );

    expect(hoisted.push).toHaveBeenCalledWith("/listings?q=camera");
  });

  it("preserves browse state and resets page when submitting from /listings", async () => {
    hoisted.pathname = "/listings";
    hoisted.searchParams = new URLSearchParams(
      "status=scheduled&category=electronics&price=lt_50&sort=price_desc&page=3&pageSize=12",
    );

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "desk lamp" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Submit listing search" }),
    );

    expect(hoisted.push).toHaveBeenCalledWith(
      "/listings?status=scheduled&q=desk+lamp&category=electronics&price=lt_50&sort=price_desc&pageSize=12",
    );
  });

  it("routes an empty trimmed query back to browse on non-listings pages", async () => {
    hoisted.pathname = "/dashboard";

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "   " },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Submit listing search" }),
    );

    expect(hoisted.push).toHaveBeenCalledWith("/listings");
  });

  it("renders the dev lifecycle trigger outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    expect(screen.getByTestId("dev-lifecycle-trigger")).toBeInTheDocument();
  });

  it("hides the dev lifecycle trigger in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    expect(
      screen.queryByTestId("dev-lifecycle-trigger"),
    ).not.toBeInTheDocument();
  });

  it("renders the notification bell for authenticated users only", async () => {
    hoisted.getSession.mockResolvedValue({
      user: {
        id: "user-1",
        name: "Augeo User",
        email: "user@example.test",
        image: null,
      },
    });

    const { SiteHeader } = await import("@/components/site-header");

    render(await SiteHeader());

    expect(screen.getByText("Notification bell")).toBeInTheDocument();
  });
});
